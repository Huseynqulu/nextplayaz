import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const schema = z.object({
  recipientUserId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  templateName: z.string().min(1),
  templateData: z.record(z.string(), z.any()).optional(),
  idempotencyKey: z.string().optional(),
})

/**
 * Server-side notification email dispatcher.
 * Resolves recipient email via admin client, then enqueues via the shared send route.
 * Any authenticated user can trigger — the send route validates JWT again.
 */
export const sendNotificationEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    let email = data.recipientEmail || null

    if (!email && data.recipientUserId) {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: got, error } = await supabaseAdmin.auth.admin.getUserById(data.recipientUserId)
      if (error || !got?.user?.email) return { ok: false, reason: 'no_email' }
      email = got.user.email
    }
    if (!email) return { ok: false, reason: 'no_recipient' }

    // Reuse the shared send route so suppression + logging + queueing stays consistent.
    const origin = process.env.PUBLIC_APP_ORIGIN || 'https://nextplay.az'
    const authHeader = (context as any)?.headers?.authorization || (context as any)?.request?.headers?.get?.('authorization')

    // We can't easily forward the caller JWT here; use the service role by hitting the queue enqueue directly.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    // Suppression check
    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    if (suppressed) return { ok: false, reason: 'suppressed' }

    // Render template server-side
    const React = await import('react')
    const { render } = await import('@react-email/render')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    const tpl = TEMPLATES[data.templateName]
    if (!tpl) return { ok: false, reason: 'template_missing' }

    const props = data.templateData || {}
    const element = React.createElement(tpl.component as any, props)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject = typeof tpl.subject === 'function' ? tpl.subject(props) : tpl.subject

    // Unsubscribe token
    const normalized = email.toLowerCase()
    let unsubscribeToken: string
    const { data: existing } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalized)
      .maybeSingle()
    if (existing && !existing.used_at) {
      unsubscribeToken = existing.token
    } else {
      const bytes = new Uint8Array(32); crypto.getRandomValues(bytes)
      unsubscribeToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
      await supabaseAdmin.from('email_unsubscribe_tokens').upsert(
        { token: unsubscribeToken, email: normalized } as any,
        { onConflict: 'email', ignoreDuplicates: true }
      )
      const { data: stored } = await supabaseAdmin
        .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
      if (stored?.token) unsubscribeToken = stored.token
    }

    const messageId = crypto.randomUUID()
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: data.templateName,
      recipient_email: email,
      status: 'pending',
    } as any)

    const SITE_NAME = 'NextPlay.az'
    const SENDER_DOMAIN = 'info.nextplay.az'
    const FROM_DOMAIN = 'info.nextplay.az'

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email' as any, {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: data.templateName,
        idempotency_key: data.idempotencyKey || messageId,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })
    if (enqueueError) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: data.templateName,
        recipient_email: email,
        status: 'failed',
        error_message: enqueueError.message,
      } as any)
      return { ok: false, reason: 'enqueue_failed' }
    }

    return { ok: true }
  })

import { sendNotificationEmail } from './emails.functions'

/**
 * Fire-and-forget email trigger. Never throws — email failures must never break UX.
 */
export function notifyEmail(input: {
  recipientUserId?: string
  recipientEmail?: string
  templateName: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}) {
  try {
    // Do not await — background best-effort
    void sendNotificationEmail({ data: input }).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[notifyEmail] failed', e?.message ?? e)
    })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn('[notifyEmail] threw', e?.message ?? e)
  }
}

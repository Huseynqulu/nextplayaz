import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Bildirişlərdən çıx — NextPlay.az" },
      { name: "description", content: "NextPlay.az e-poçt bildirişlərindən abunəlikdən çıxma səhifəsi." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/unsubscribe" }],
  }),
})

function UnsubscribePage() {
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'invalid' | 'error'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    if (!t) { setState('invalid'); return }
    setToken(t)
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (!r.ok) { setState('invalid'); return }
        const data = await r.json().catch(() => ({}))
        if (data?.email) setEmail(data.email)
        setState(data?.already ? 'done' : 'ready')
      })
      .catch(() => setState('error'))
  }, [])

  async function confirm() {
    if (!token) return
    const r = await fetch('/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setState(r.ok ? 'done' : 'error')
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold mb-3">Bildirişlərdən çıxış</h1>
        {state === 'loading' && <p className="text-muted-foreground">Yüklənir…</p>}
        {state === 'invalid' && <p className="text-destructive">Link etibarsızdır və ya vaxtı keçib.</p>}
        {state === 'error' && <p className="text-destructive">Xəta baş verdi, yenidən cəhd edin.</p>}
        {state === 'ready' && (
          <>
            <p className="text-muted-foreground mb-4">{email ?? 'Email'} ünvanı bütün bildirişlərdən çıxarılacaq.</p>
            <button onClick={confirm} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Təsdiqlə</button>
          </>
        )}
        {state === 'done' && <p className="text-emerald-500">Uğurla ləğv edildi. Artıq bildiriş gəlməyəcək.</p>}
      </div>
    </div>
  )
}

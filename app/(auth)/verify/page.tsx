'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const router = useRouter()
  const t = useTranslations('auth')

  useEffect(() => {
    const supabase = createClient()
    let subscription: { unsubscribe: () => void } | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    function vaiAvanti() {
      const hasPending = !!localStorage.getItem('pending_application')
      router.replace(hasPending ? '/apply/complete' : '/dashboard')
    }

    async function init() {
      // La sessione viene stabilita dal client appena legge il codice
      // nell'indirizzo: spesso è già pronta prima che il listener qui sotto
      // sia attivo, e in quel caso l'evento SIGNED_IN è già passato. Senza
      // questo controllo la pagina resterebbe in caricamento per sempre
      // (stesso motivo per cui /apply/complete parte da getUser()).
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        vaiAvanti()
        return
      }

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          data.subscription.unsubscribe()
          vaiAvanti()
        }
      })
      subscription = data.subscription

      // Il link è valido una volta sola: se è scaduto o già usato (capita
      // quando il provider di posta lo apre in anticipo per controllarlo)
      // la sessione non arriverà mai. Meglio rimandare al login che lasciare
      // la clessidra a girare all'infinito.
      timeout = setTimeout(() => {
        subscription?.unsubscribe()
        router.replace('/login')
      }, 10000)
    }

    init()

    return () => {
      subscription?.unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center', color: 'var(--text)' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: 'var(--text-tertiary)' }}>{t('verify.verifying')}</p>
      </div>
    </div>
  )
}

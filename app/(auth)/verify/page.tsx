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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        const hasPending = !!localStorage.getItem('pending_application')
        router.push(hasPending ? '/apply/complete' : '/dashboard')
      }
    })

    return () => subscription.unsubscribe()
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

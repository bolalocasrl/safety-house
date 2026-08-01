'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify` }
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '48px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Image src="/logo.png" alt={t('logoAlt')} width={32} height={36} priority />
          <h1 style={{ color: 'var(--text)', fontSize: '24px' }}>
            {t('brand')}
          </h1>
        </div>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: '32px' }}>
          {t('login.subtitle')}
        </p>

        {sent ? (
          <div style={{ color: 'var(--success)', textAlign: 'center', padding: '24px 0' }}>
            {t('login.sentMessage')}
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '15px',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? t('login.sending') : t('login.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
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
      background: '#0D1117',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#1C2230',
        padding: '48px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid #2E3540'
      }}>
        <h1 style={{ color: '#fff', fontSize: '24px', marginBottom: '8px' }}>
          Safety House
        </h1>
        <p style={{ color: '#6B7585', marginBottom: '32px' }}>
          Accedi con la tua email
        </p>

        {sent ? (
          <div style={{ color: '#1BA35A', textAlign: 'center', padding: '24px 0' }}>
            ✓ Link inviato! Controlla la tua email.
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="La tua email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0D1117',
                border: '1px solid #2E3540',
                borderRadius: '8px',
                color: '#fff',
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
                background: '#1060E8',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Invio...' : 'Invia Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

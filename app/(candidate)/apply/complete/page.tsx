'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PendingApplication = {
  listing_id: string
  full_name: string
  email: string
  phone: string
  dni_nie: string
  nationality: string
  employment_type: string
  monthly_income: number
  contract_type: string
  has_pets: boolean
  smoker: boolean
  num_occupants: number
  extra_notes: string
}

export default function ApplyCompletePage() {
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function complete() {
      const supabase = createClient()

      // Legge i dati salvati prima dell'OTP
      const raw = localStorage.getItem('pending_application')
      if (!raw) {
        router.replace('/dashboard')
        return
      }

      let pending: PendingApplication
      try {
        pending = JSON.parse(raw)
      } catch {
        localStorage.removeItem('pending_application')
        router.replace('/dashboard')
        return
      }

      // Verifica che l'utente sia autenticato
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setErrorMessage('Sessione non trovata. Riprova dalla pagina dell\'annuncio.')
        setStatus('error')
        return
      }

      // Upsert candidato usando id come chiave univoca
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .upsert(
          {
            id: session.user.id,
            user_id: session.user.id,
            full_name: pending.full_name,
            email: pending.email,
            phone: pending.phone,
            dni_nie: pending.dni_nie,
            nationality: pending.nationality,
            employment_type: pending.employment_type,
            monthly_income: pending.monthly_income,
            contract_type: pending.contract_type,
            has_pets: pending.has_pets,
            smoker: pending.smoker,
            num_occupants: pending.num_occupants,
            extra_notes: pending.extra_notes,
          },
          { onConflict: 'id' }
        )
        .select('id')
        .single()

      if (candidateError || !candidate) {
        setErrorMessage('Errore nel salvataggio del profilo. Riprova tra qualche istante.')
        setStatus('error')
        return
      }

      // Insert candidatura
      const { error: applicationError } = await supabase
        .from('applications')
        .insert({
          listing_id: pending.listing_id,
          candidate_id: candidate.id,
          status: 'pending',
        })

      if (applicationError) {
        // Candidatura già esistente: trattalo come successo silenzioso
        if (applicationError.code !== '23505') {
          setErrorMessage('Errore nell\'invio della candidatura. Riprova tra qualche istante.')
          setStatus('error')
          return
        }
      }

      localStorage.removeItem('pending_application')
      setStatus('success')
    }

    complete()
  }, [router])

  if (status === 'processing') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0D1117', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#6B7585', fontSize: '14px' }}>Finalizzazione candidatura in corso...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0D1117', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ color: '#6B7585', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
            {errorMessage}
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 24px', background: '#1060E8', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}
          >
            Torna indietro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D1117', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '440px', padding: '24px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(27,163,90,0.15)', border: '2px solid #1BA35A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '28px',
        }}>
          ✓
        </div>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
          Candidatura inviata con successo!
        </h1>
        <p style={{ color: '#6B7585', fontSize: '14px', lineHeight: '1.6' }}>
          La tua candidatura è stata registrata. Sarai contattato dall'agenzia per i prossimi passi.
        </p>
      </div>
    </div>
  )
}

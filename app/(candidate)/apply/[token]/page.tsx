'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Listing = {
  id: string
  title: string
  address: string
  city: string
  monthly_rent: number
  rooms: number
}

type Step1 = {
  full_name: string
  email: string
  phone: string
  dni_nie: string
  nationality: string
}

type Step2 = {
  employment_type: string
  monthly_income: string
  contract_type: string
}

type Step3 = {
  has_pets: boolean
  smoker: boolean
  num_occupants: string
  extra_notes: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: '#0D1117',
  border: '1px solid #2E3540',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9AA3B2',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

function formatRent(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: i < current ? '#1BA35A' : i === current ? '#1060E8' : '#2E3540',
            color: i <= current ? '#fff' : '#6B7585',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 600, flexShrink: 0,
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ width: '32px', height: '2px', background: i < current ? '#1BA35A' : '#2E3540', borderRadius: '1px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const supabase = createClient()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loadingListing, setLoadingListing] = useState(true)
  const [invalidToken, setInvalidToken] = useState(false)

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [step1, setStep1] = useState<Step1>({
    full_name: '', email: '', phone: '', dni_nie: '', nationality: '',
  })
  const [step2, setStep2] = useState<Step2>({
    employment_type: '', monthly_income: '', contract_type: '',
  })
  const [step3, setStep3] = useState<Step3>({
    has_pets: false, smoker: false, num_occupants: '1', extra_notes: '',
  })

  useEffect(() => {
    async function loadListing() {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, address, city, monthly_rent, rooms')
        .eq('public_link_token', token)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        setInvalidToken(true)
      } else {
        setListing(data as Listing)
      }
      setLoadingListing(false)
    }

    loadListing()
  }, [token])

  function set1(field: keyof Step1, value: string) {
    setStep1(prev => ({ ...prev, [field]: value }))
  }
  function set2(field: keyof Step2, value: string) {
    setStep2(prev => ({ ...prev, [field]: value }))
  }
  function set3(field: keyof Step3, value: string | boolean) {
    setStep3(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!listing) return
    setSubmitting(true)
    setSubmitError(null)

    // 1. Salva i dati in localStorage — gli insert avverranno dopo auth in /apply/complete
    localStorage.setItem('pending_application', JSON.stringify({
      listing_id: listing.id,
      full_name: step1.full_name,
      email: step1.email,
      phone: step1.phone,
      dni_nie: step1.dni_nie,
      nationality: step1.nationality,
      employment_type: step2.employment_type,
      monthly_income: Number(step2.monthly_income),
      contract_type: step2.contract_type,
      has_pets: step3.has_pets,
      smoker: step3.smoker,
      num_occupants: Number(step3.num_occupants),
      extra_notes: step3.extra_notes,
    }))

    // 2. Invia Magic Link OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: step1.email,
      options: { shouldCreateUser: true },
    })

    if (otpError) {
      localStorage.removeItem('pending_application')
      setSubmitError('Errore nell\'invio dell\'email di verifica. Controlla l\'indirizzo inserito.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (loadingListing) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7585', fontSize: '14px' }}>Caricamento annuncio...</p>
      </div>
    )
  }

  if (invalidToken || !listing) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Annuncio non disponibile</h1>
          <p style={{ color: '#6B7585', fontSize: '14px' }}>
            Il link che hai seguito non è valido o l'annuncio non è più attivo.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            Candidatura inviata!
          </h1>
          <p style={{ color: '#6B7585', fontSize: '14px', lineHeight: '1.6' }}>
            Controlla la tua email: ti abbiamo inviato un link per completare la candidatura per{' '}
            <strong style={{ color: '#9AA3B2' }}>{listing.title}</strong>.
            Clicca il link nell'email per confermare la tua identità e finalizzare l'invio.
          </p>
        </div>
      </div>
    )
  }

  const STEP_TITLES = ['Dati personali', 'Situazione lavorativa', 'Stile di vita']

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Intestazione annuncio */}
        <div style={{
          background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px',
          padding: '20px 24px', marginBottom: '32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <p style={{ color: '#6B7585', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Candidatura per
            </p>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{listing.title}</p>
            <p style={{ color: '#6B7585', fontSize: '13px' }}>{listing.address}, {listing.city}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#1060E8', fontSize: '18px', fontWeight: 700 }}>
              {formatRent(listing.monthly_rent)}
            </p>
            <p style={{ color: '#6B7585', fontSize: '12px' }}>/mese · {listing.rooms} stanze</p>
          </div>
        </div>

        {/* Card form */}
        <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '32px' }}>
          <StepIndicator current={step} total={3} />

          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            {STEP_TITLES[step]}
          </h2>

          {/* Step 1 — Dati personali */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input style={inputStyle} type="text" placeholder="Mario Rossi" value={step1.full_name} onChange={e => set1('full_name', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" placeholder="mario@email.com" value={step1.email} onChange={e => set1('email', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Telefono</label>
                <input style={inputStyle} type="tel" placeholder="+39 333 1234567" value={step1.phone} onChange={e => set1('phone', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>DNI / NIE</label>
                  <input style={inputStyle} type="text" placeholder="12345678A" value={step1.dni_nie} onChange={e => set1('dni_nie', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Nazionalità</label>
                  <input style={inputStyle} type="text" placeholder="Italiana" value={step1.nationality} onChange={e => set1('nationality', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Situazione lavorativa */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Tipo di impiego</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={step2.employment_type}
                  onChange={e => set2('employment_type', e.target.value)}
                >
                  <option value="" disabled>Seleziona...</option>
                  <option value="dipendente">Dipendente</option>
                  <option value="autonomo">Lavoratore autonomo</option>
                  <option value="libero_professionista">Libero professionista</option>
                  <option value="studente">Studente</option>
                  <option value="pensionato">Pensionato</option>
                  <option value="disoccupato">In cerca di lavoro</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reddito mensile netto (€)</label>
                <input style={inputStyle} type="number" min="0" placeholder="2000" value={step2.monthly_income} onChange={e => set2('monthly_income', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Tipo di contratto</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={step2.contract_type}
                  onChange={e => set2('contract_type', e.target.value)}
                >
                  <option value="" disabled>Seleziona...</option>
                  <option value="indeterminato">Tempo indeterminato</option>
                  <option value="determinato">Tempo determinato</option>
                  <option value="apprendistato">Apprendistato</option>
                  <option value="partita_iva">Partita IVA</option>
                  <option value="nessuno">Nessun contratto</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Stile di vita */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={step3.has_pets}
                    onChange={e => set3('has_pets', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#1060E8', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#9AA3B2', fontSize: '14px' }}>Ho animali domestici</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={step3.smoker}
                    onChange={e => set3('smoker', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#1060E8', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#9AA3B2', fontSize: '14px' }}>Sono fumatore</span>
                </label>
              </div>
              <div>
                <label style={labelStyle}>Numero di occupanti (incluso te)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  value={step3.num_occupants}
                  onChange={e => set3('num_occupants', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Note aggiuntive</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' } as React.CSSProperties}
                  placeholder="Qualsiasi informazione aggiuntiva che vuoi condividere..."
                  value={step3.extra_notes}
                  onChange={e => set3('extra_notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {submitError && (
            <div style={{
              marginTop: '20px',
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: '8px', padding: '12px 16px', color: '#f87171', fontSize: '13px',
            }}>
              {submitError}
            </div>
          )}

          {/* Navigazione step */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '32px' }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '11px 20px', borderRadius: '8px', fontSize: '14px',
                  background: 'transparent', color: '#6B7585',
                  border: '1px solid #2E3540', cursor: 'pointer',
                }}
              >
                Indietro
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (step < 2) {
                  setStep(s => s + 1)
                } else {
                  handleSubmit()
                }
              }}
              style={{
                flex: 1, padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                background: '#1060E8', color: '#fff', border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {step < 2
                ? 'Continua'
                : submitting
                  ? 'Invio in corso...'
                  : 'Invia candidatura'}
            </button>
          </div>
        </div>

        <p style={{ color: '#6B7585', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
          I tuoi dati sono al sicuro e verranno usati solo per la valutazione della candidatura.
        </p>
      </div>
    </div>
  )
}

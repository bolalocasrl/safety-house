'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Procedure = {
  id: string
  step_current: number
  status: string
  incasol_code: string | null
  archive_expires_at: string | null
  created_at: string
  listing_id: string
  candidate_id: string
  candidates: { full_name: string | null; email: string | null } | null
  listings: { title: string; address: string; city: string } | null
}

const STEPS = [
  {
    n: 1,
    title: 'Seguro de Impago',
    desc: 'Verifica e carica la polizza Seguro de Impago. Il candidato deve essere coperto prima di procedere con la firma del contratto.',
  },
  {
    n: 2,
    title: 'Contratto',
    desc: 'Prepara e verifica il contratto di affitto con tutti i termini concordati tra le parti.',
  },
  {
    n: 3,
    title: 'Firma Digitale',
    desc: 'Invia il contratto per la firma digitale tramite Signaturit a tutte le parti coinvolte.',
  },
  {
    n: 4,
    title: 'Incasòl',
    desc: 'Registra il contratto presso l\'Incasòl inserendo il codice di 6 cifre rilasciato dalla Generalitat de Catalunya. Questo passaggio è obbligatorio per legge.',
  },
  {
    n: 5,
    title: 'Archiviazione',
    desc: 'Archivia tutta la documentazione del procedimento. Il fascicolo sarà conservato per 90 giorni come previsto dal GDPR.',
  },
]

function StepIndicator({ stepCurrent, status }: { stepCurrent: number; status: string }) {
  const isCompleted = status === 'completed'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '32px' }}>
      {STEPS.map((step, i) => {
        const done = isCompleted || step.n < stepCurrent
        const active = !isCompleted && step.n === stepCurrent
        const color = done ? '#1BA35A' : active ? '#1060E8' : '#2E3540'
        const textColor = done || active ? '#fff' : '#6B7585'

        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: color, color: textColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, flexShrink: 0,
                border: active ? '2px solid rgba(16,96,232,0.4)' : 'none',
                boxShadow: active ? '0 0 0 4px rgba(16,96,232,0.15)' : 'none',
              }}>
                {done ? '✓' : step.n}
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 500, color: done ? '#1BA35A' : active ? '#fff' : '#6B7585',
                whiteSpace: 'nowrap', letterSpacing: '0.02em',
              }}>
                {step.title}
              </span>
            </div>
            {i < 4 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 4px', marginBottom: '18px',
                background: done ? '#1BA35A' : '#2E3540', borderRadius: '1px',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ProcedureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [procedure, setProcedure] = useState<Procedure | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [incasolCode, setIncasolCode] = useState('')
  const [incasolError, setIncasolError] = useState<string | null>(null)
  const [advanceError, setAdvanceError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('procedures')
        .select('*, candidates(full_name, email), listings(title, address, city)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setProcedure(data as unknown as Procedure)
        if ((data as unknown as Procedure).incasol_code) {
          setIncasolCode((data as unknown as Procedure).incasol_code ?? '')
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function advanceStep() {
    if (!procedure) return
    setAdvanceError(null)

    // Validazione Incasòl step 4
    if (procedure.step_current === 4) {
      if (!/^\d{6}$/.test(incasolCode.trim())) {
        setIncasolError('Il codice Incasòl deve essere esattamente 6 cifre numeriche.')
        return
      }
      setIncasolError(null)
    }

    setAdvancing(true)
    const isLastStep = procedure.step_current === 5

    const updateData: Record<string, unknown> = isLastStep
      ? {
          status: 'completed',
          archive_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : { step_current: procedure.step_current + 1 }

    if (procedure.step_current === 4) {
      updateData.incasol_code = incasolCode.trim()
    }

    const { error } = await supabase
      .from('procedures')
      .update(updateData)
      .eq('id', procedure.id)

    if (error) {
      setAdvanceError('Errore durante l\'aggiornamento. Riprova.')
    } else {
      setProcedure(prev => prev ? { ...prev, ...updateData } as Procedure : prev)
    }
    setAdvancing(false)
  }

  if (loading) {
    return (
      <div style={{ color: '#6B7585', fontSize: '14px', paddingTop: '48px', textAlign: 'center' }}>
        Caricamento...
      </div>
    )
  }

  if (notFound || !procedure) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Procedimento non trovato</p>
        <a href="/procedures" style={{ color: '#1060E8', fontSize: '14px' }}>← Torna ai procedimenti</a>
      </div>
    )
  }

  const isCompleted = procedure.status === 'completed'
  const currentStep = STEPS.find(s => s.n === procedure.step_current)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <a href="/procedures" style={{ color: '#6B7585', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>
          ← Procedimenti
        </a>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
              {procedure.candidates?.full_name ?? 'Candidato'}
            </h1>
            <p style={{ color: '#6B7585', fontSize: '14px' }}>
              {procedure.listings?.title} · {procedure.listings?.address}, {procedure.listings?.city}
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
            color: isCompleted ? '#1BA35A' : '#1060E8',
            background: isCompleted ? 'rgba(27,163,90,0.12)' : 'rgba(16,96,232,0.12)',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
            {isCompleted ? 'Completato' : 'In corso'}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '28px 32px', marginBottom: '20px' }}>
        <StepIndicator stepCurrent={procedure.step_current} status={procedure.status} />

        {/* Completato banner */}
        {isCompleted ? (
          <div style={{
            background: 'rgba(27,163,90,0.08)', border: '1px solid rgba(27,163,90,0.25)',
            borderRadius: '10px', padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
            <h2 style={{ color: '#1BA35A', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Procedimento completato
            </h2>
            <p style={{ color: '#6B7585', fontSize: '13px' }}>
              Documentazione archiviata.{' '}
              {procedure.archive_expires_at && (
                <>Scadenza archivio: <strong style={{ color: '#9AA3B2' }}>
                  {new Date(procedure.archive_expires_at).toLocaleDateString('it-IT')}
                </strong></>
              )}
            </p>
            {procedure.incasol_code && (
              <p style={{ color: '#6B7585', fontSize: '12px', marginTop: '8px' }}>
                Codice Incasòl registrato: <code style={{ color: '#9AA3B2', background: '#0D1117', padding: '2px 8px', borderRadius: '4px' }}>{procedure.incasol_code}</code>
              </p>
            )}
          </div>
        ) : (
          /* Step corrente */
          <div style={{ background: '#0D1117', border: '1px solid #2E3540', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#1060E8', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {procedure.step_current}
              </div>
              <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>
                {currentStep?.title}
              </h2>
            </div>

            <p style={{ color: '#6B7585', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              {currentStep?.desc}
            </p>

            {/* Incasòl: campo codice */}
            {procedure.step_current === 4 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', color: '#9AA3B2', fontSize: '12px', fontWeight: 500,
                  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Codice Incasòl (6 cifre) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={incasolCode}
                  onChange={e => {
                    setIncasolCode(e.target.value.replace(/\D/g, ''))
                    setIncasolError(null)
                  }}
                  placeholder="123456"
                  style={{
                    width: '160px',
                    padding: '10px 14px',
                    background: '#1C2230',
                    border: `1px solid ${incasolError ? 'rgba(220,38,38,0.6)' : '#2E3540'}`,
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.15em',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {incasolError && (
                  <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>{incasolError}</p>
                )}
              </div>
            )}

            {advanceError && (
              <div style={{
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                borderRadius: '8px', padding: '10px 14px', color: '#f87171',
                fontSize: '13px', marginBottom: '16px',
              }}>
                {advanceError}
              </div>
            )}

            <button
              onClick={advanceStep}
              disabled={advancing}
              style={{
                padding: '11px 24px',
                background: '#1060E8', color: '#fff',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 500,
                cursor: advancing ? 'not-allowed' : 'pointer',
                opacity: advancing ? 0.7 : 1,
              }}
            >
              {advancing
                ? 'Salvataggio...'
                : procedure.step_current === 5
                  ? 'Archivia e Completa Procedimento'
                  : `Completa e passa a: ${STEPS[procedure.step_current]?.title ?? 'Fase successiva'}`
              }
            </button>
          </div>
        )}
      </div>

      {/* Step completati */}
      {procedure.step_current > 1 && (
        <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '20px 24px' }}>
          <p style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Fasi completate
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STEPS.filter(s => s.n < procedure.step_current || isCompleted).map(step => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(27,163,90,0.15)', color: '#1BA35A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, flexShrink: 0,
                }}>✓</div>
                <span style={{ color: '#9AA3B2', fontSize: '13px' }}>{step.title}</span>
                {step.n === 4 && procedure.incasol_code && (
                  <code style={{ color: '#6B7585', fontSize: '12px', background: '#0D1117', padding: '2px 8px', borderRadius: '4px', marginLeft: '4px' }}>
                    {procedure.incasol_code}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

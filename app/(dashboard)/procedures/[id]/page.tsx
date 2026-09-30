'use client'

import { use, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/format'
import { TestataPagina, ElencoRighe } from '@/components/scheletro'
import Link from 'next/link'
import { IconaFreccia } from '@/components/icone'

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

type Step = { n: number; title: string; desc: string }

function StepIndicator({ stepCurrent, status, steps }: { stepCurrent: number; status: string; steps: Step[] }) {
  const isCompleted = status === 'completed'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '32px' }}>
      {steps.map((step, i) => {
        const done = isCompleted || step.n < stepCurrent
        const active = !isCompleted && step.n === stepCurrent
        const color = done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--border)'
        const textColor = done || active ? 'var(--primary-foreground)' : 'var(--text-tertiary)'

        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: color, color: textColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, flexShrink: 0,
                border: active ? '2px solid color-mix(in srgb, var(--primary) 40%, transparent)' : 'none',
                boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--primary) 15%, transparent)' : 'none',
              }}>
                {done ? '✓' : step.n}
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 500, color: done ? 'var(--success)' : active ? 'var(--text)' : 'var(--text-tertiary)',
                whiteSpace: 'nowrap', letterSpacing: '0.02em',
              }}>
                {step.title}
              </span>
            </div>
            {i < 4 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 4px', marginBottom: '18px',
                background: done ? 'var(--success)' : 'var(--border)', borderRadius: '1px',
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
  const t = useTranslations('procedures.detail')
  const tc = useTranslations('common')
  const locale = useLocale()

  const STEPS: Step[] = [
    { n: 1, title: t('step1Title'), desc: t('step1Desc') },
    { n: 2, title: t('step2Title'), desc: t('step2Desc') },
    { n: 3, title: t('step3Title'), desc: t('step3Desc') },
    { n: 4, title: t('step4Title'), desc: t('step4Desc') },
    { n: 5, title: t('step5Title'), desc: t('step5Desc') },
  ]

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
        setIncasolError(t('incasolError'))
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
      setAdvanceError(t('advanceError'))
    } else {
      setProcedure(prev => prev ? { ...prev, ...updateData } as Procedure : prev)
    }
    setAdvancing(false)
  }

  if (loading) {
    return (
      <div>
        <TestataPagina />
        <ElencoRighe righe={5} />
      </div>
    )
  }

  if (notFound || !procedure) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: 'var(--text)', fontSize: '18px', marginBottom: '8px' }}>{t('notFound')}</p>
        <Link href="/procedures" className="text-primary text-sm">{t('backToProceduresLink')}</Link>
      </div>
    )
  }

  const isCompleted = procedure.status === 'completed'
  const currentStep = STEPS.find(s => s.n === procedure.step_current)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/procedures" className="text-text-tertiary hover:text-text mb-2 inline-flex items-center gap-1.5 text-[13px] transition-colors">
          <IconaFreccia className="h-3.5 w-3.5 rotate-180" />
          {t('backToProcedures')}
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="text-text mb-1 text-[24px] font-bold tracking-tight md:text-[30px]">
              {procedure.candidates?.full_name ?? t('defaultCandidateName')}
            </h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
              {procedure.listings?.title} · {procedure.listings?.address}, {procedure.listings?.city}
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
            color: isCompleted ? 'var(--success)' : 'var(--primary)',
            background: isCompleted ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--primary) 12%, transparent)',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
            {isCompleted ? tc('status.completed') : tc('status.inProgress')}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-surface border-border sh-scheda mb-5 rounded-xl border px-8 py-7">
        <StepIndicator stepCurrent={procedure.step_current} status={procedure.status} steps={STEPS} />

        {/* Completato banner */}
        {isCompleted ? (
          <div style={{
            background: 'color-mix(in srgb, var(--success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
            borderRadius: '10px', padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
            <h2 style={{ color: 'var(--success)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              {t('completedBannerTitle')}
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {t('archivedDoc')}{' '}
              {procedure.archive_expires_at && (
                <>{t('archiveExpiry')} <strong style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(procedure.archive_expires_at, locale)}
                </strong></>
              )}
            </p>
            {procedure.incasol_code && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '8px' }}>
                {t('incasolRegistered')} <code style={{ color: 'var(--text-secondary)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px' }}>{procedure.incasol_code}</code>
              </p>
            )}
          </div>
        ) : (
          /* Step corrente */
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {procedure.step_current}
              </div>
              <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>
                {currentStep?.title}
              </h2>
            </div>

            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              {currentStep?.desc}
            </p>

            {/* Incasòl: campo codice */}
            {procedure.step_current === 4 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500,
                  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {t('incasolLabel')}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={incasolCode}
                  onChange={e => {
                    setIncasolCode(e.target.value.replace(/\D/g, ''))
                    setIncasolError(null)
                  }}
                  placeholder={t('incasolPlaceholder')}
                  style={{
                    width: '160px',
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: `1px solid ${incasolError ? 'color-mix(in srgb, var(--danger) 60%, transparent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.15em',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {incasolError && (
                  <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>{incasolError}</p>
                )}
              </div>
            )}

            {advanceError && (
              <div style={{
                background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
                borderRadius: '8px', padding: '10px 14px', color: 'var(--danger)',
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
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 500,
                cursor: advancing ? 'not-allowed' : 'pointer',
                opacity: advancing ? 0.7 : 1,
              }}
            >
              {advancing
                ? t('saving')
                : procedure.step_current === 5
                  ? t('completeAndArchive')
                  : t('completeAndAdvance', { next: STEPS[procedure.step_current]?.title ?? '' })
              }
            </button>
          </div>
        )}
      </div>

      {/* Step completati */}
      {procedure.step_current > 1 && (
        <div className="bg-surface border-border sh-scheda rounded-xl border px-6 py-5">
          <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            {t('completedStepsTitle')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STEPS.filter(s => s.n < procedure.step_current || isCompleted).map(step => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, flexShrink: 0,
                }}>✓</div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{step.title}</span>
                {step.n === 4 && procedure.incasol_code && (
                  <code style={{ color: 'var(--text-tertiary)', fontSize: '12px', background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px', marginLeft: '4px' }}>
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

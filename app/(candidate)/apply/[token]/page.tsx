'use client'

import { use, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/format'

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

type Step4 = {
  vida_laboral_csv_code: string
}

type Uploads = {
  contract: boolean
  nomina: boolean
  identity: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// Vida Laboral CSV: 6 gruppi di 5 caratteri alfanumerici maiuscoli separati da trattino
// Esempio: HCQIN-D2BSU-XZIKJ-NWT5R-WFP2H-YUHQX
const CSV_REGEX = /^[A-Z0-9]{5}(-[A-Z0-9]{5}){5}$/

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: i < current ? 'var(--success)' : i === current ? 'var(--primary)' : 'var(--border)',
            color: i <= current ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 600, flexShrink: 0,
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ width: '24px', height: '2px', background: i < current ? 'var(--success)' : 'var(--border)', borderRadius: '1px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function MockUploadField({
  label,
  uploaded,
  uploadedLabel,
  emptyLabel,
  changeLabel,
  selectLabel,
  onUpload,
}: {
  label: string
  uploaded: boolean
  uploadedLabel: string
  emptyLabel: string
  changeLabel: string
  selectLabel: string
  onUpload: () => void
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px',
        background: 'var(--bg)',
        border: `1px solid ${uploaded ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: '8px',
        transition: 'border-color 0.2s',
      }}>
        {uploaded ? (
          <span style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 500 }}>
            {uploadedLabel}
          </span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>{emptyLabel}</span>
        )}
        <button
          type="button"
          onClick={onUpload}
          style={{
            padding: '6px 14px',
            background: uploaded ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
            border: `1px solid ${uploaded ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'color-mix(in srgb, var(--primary) 30%, transparent)'}`,
            borderRadius: '6px',
            color: uploaded ? 'var(--success)' : 'var(--primary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {uploaded ? changeLabel : selectLabel}
        </button>
      </div>
    </div>
  )
}

export default function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const supabase = createClient()
  const t = useTranslations('apply')
  const tc = useTranslations('common')
  const locale = useLocale()

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
  const [step4, setStep4] = useState<Step4>({ vida_laboral_csv_code: '' })
  const [uploads, setUploads] = useState<Uploads>({ contract: false, nomina: false, identity: false })
  const [csvError, setCsvError] = useState<string | null>(null)

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
  function set4(field: keyof Step4, value: string) {
    setCsvError(null)
    setStep4(prev => ({ ...prev, [field]: value }))
  }
  function setUpload(field: keyof Uploads) {
    setUploads(prev => ({ ...prev, [field]: true }))
  }

  async function handleSubmit() {
    if (!listing) return

    // Valida formato CSV Vida Laboral
    const csvCode = step4.vida_laboral_csv_code.trim().toUpperCase()
    if (csvCode && !CSV_REGEX.test(csvCode)) {
      setCsvError(t('step4.csvError'))
      return
    }

    setSubmitting(true)
    setSubmitError(null)

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
      vida_laboral_csv_code: csvCode || null,
    }))

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: step1.email,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/verify` },
    })

    if (otpError) {
      localStorage.removeItem('pending_application')
      setSubmitError(t('states.otpError'))
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (loadingListing) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>{t('states.loadingListing')}</p>
      </div>
    )
  }

  if (invalidToken || !listing) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ color: 'var(--text)', fontSize: '20px', marginBottom: '8px' }}>{t('states.invalidTitle')}</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
            {t('states.invalidDesc')}
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', padding: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--success) 15%, transparent)', border: '2px solid var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '28px',
          }}>
            ✓
          </div>
          <h1 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
            {t('states.submittedTitle')}
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: '1.6' }}>
            {t.rich('states.submittedDesc', {
              title: listing.title,
              b: (chunks) => <strong style={{ color: 'var(--text-secondary)' }}>{chunks}</strong>,
            })}
          </p>
        </div>
      </div>
    )
  }

  const STEP_TITLES = [t('steps.personal'), t('steps.employment'), t('steps.lifestyle'), t('steps.documents')]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Intestazione annuncio */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '20px 24px', marginBottom: '32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {t('header.applyingFor')}
            </p>
            <p style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>{listing.title}</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{listing.address}, {listing.city}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: 700 }}>
              {formatCurrency(listing.monthly_rent, locale)}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{tc('perMonth')} · {t('header.rooms', { count: listing.rooms })}</p>
          </div>
        </div>

        {/* Card form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px' }}>
          <StepIndicator current={step} total={4} />

          <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            {STEP_TITLES[step]}
          </h2>

          {/* Step 1 — Dati personali */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>{t('step1.fullName')}</label>
                <input style={inputStyle} type="text" placeholder={t('step1.fullNamePlaceholder')} value={step1.full_name} onChange={e => set1('full_name', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>{t('step1.email')}</label>
                <input style={inputStyle} type="email" placeholder={t('step1.emailPlaceholder')} value={step1.email} onChange={e => set1('email', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>{t('step1.phone')}</label>
                <input style={inputStyle} type="tel" placeholder={t('step1.phonePlaceholder')} value={step1.phone} onChange={e => set1('phone', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{t('step1.dniNie')}</label>
                  <input style={inputStyle} type="text" placeholder={t('step1.dniNiePlaceholder')} value={step1.dni_nie} onChange={e => set1('dni_nie', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>{t('step1.nationality')}</label>
                  <input style={inputStyle} type="text" placeholder={t('step1.nationalityPlaceholder')} value={step1.nationality} onChange={e => set1('nationality', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Situazione lavorativa */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>{t('step2.employmentType')}</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={step2.employment_type}
                  onChange={e => set2('employment_type', e.target.value)}
                >
                  <option value="" disabled>{t('step2.selectPlaceholder')}</option>
                  <option value="employed">{t('step2.employed')}</option>
                  <option value="self_employed">{t('step2.selfEmployed')}</option>
                  <option value="student">{t('step2.student')}</option>
                  <option value="retired">{t('step2.retired')}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t('step2.monthlyIncome')}</label>
                <input style={inputStyle} type="number" min="0" placeholder={t('step2.monthlyIncomePlaceholder')} value={step2.monthly_income} onChange={e => set2('monthly_income', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t('step2.contractType')}</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={step2.contract_type}
                  onChange={e => set2('contract_type', e.target.value)}
                >
                  <option value="" disabled>{t('step2.selectPlaceholder')}</option>
                  <option value="indefinido">{t('step2.indefinido')}</option>
                  <option value="temporal">{t('step2.temporal')}</option>
                  <option value="autonomo">{t('step2.autonomo')}</option>
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
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('step3.hasPets')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={step3.smoker}
                    onChange={e => set3('smoker', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('step3.smoker')}</span>
                </label>
              </div>
              <div>
                <label style={labelStyle}>{t('step3.occupants')}</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  value={step3.num_occupants}
                  onChange={e => set3('num_occupants', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('step3.extraNotes')}</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' } as React.CSSProperties}
                  placeholder={t('step3.extraNotesPlaceholder')}
                  value={step3.extra_notes}
                  onChange={e => set3('extra_notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4 — Documenti e Verifica */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <MockUploadField
                label={t('step4.docContract')}
                uploaded={uploads.contract}
                uploadedLabel={t('step4.uploaded')}
                emptyLabel={t('step4.noFileSelected')}
                changeLabel={t('step4.change')}
                selectLabel={t('step4.selectFile')}
                onUpload={() => setUpload('contract')}
              />
              <MockUploadField
                label={t('step4.docPayslip')}
                uploaded={uploads.nomina}
                uploadedLabel={t('step4.uploaded')}
                emptyLabel={t('step4.noFileSelected')}
                changeLabel={t('step4.change')}
                selectLabel={t('step4.selectFile')}
                onUpload={() => setUpload('nomina')}
              />
              <MockUploadField
                label={t('step4.docIdentity')}
                uploaded={uploads.identity}
                uploadedLabel={t('step4.uploaded')}
                emptyLabel={t('step4.noFileSelected')}
                changeLabel={t('step4.change')}
                selectLabel={t('step4.selectFile')}
                onUpload={() => setUpload('identity')}
              />

              <div>
                <label style={labelStyle}>{t('step4.csvLabel')}</label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: csvError ? 'color-mix(in srgb, var(--danger) 60%, transparent)' : 'var(--border)',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                  }}
                  type="text"
                  placeholder={t('step4.csvPlaceholder')}
                  value={step4.vida_laboral_csv_code}
                  onChange={e => set4('vida_laboral_csv_code', e.target.value.toUpperCase())}
                  maxLength={35}
                />
                {csvError && (
                  <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>{csvError}</p>
                )}
                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '6px', lineHeight: '1.5' }}>
                  {t('step4.csvHint')}
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div style={{
              marginTop: '20px',
              background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
              borderRadius: '8px', padding: '12px 16px', color: 'var(--danger)', fontSize: '13px',
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
                  background: 'transparent', color: 'var(--text-tertiary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                {t('nav.back')}
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (step < 3) {
                  setStep(s => s + 1)
                } else {
                  handleSubmit()
                }
              }}
              style={{
                flex: 1, padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {step < 3
                ? t('nav.continue')
                : submitting
                  ? t('nav.submitting')
                  : t('nav.submit')}
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
          {t('footerNote')}
        </p>
      </div>
    </div>
  )
}

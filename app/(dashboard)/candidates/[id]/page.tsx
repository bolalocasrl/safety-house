import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'
import { DocumentStatusBadge, type DocumentStatus } from '@/components/document-status-badge'

type Candidate = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  dni_nie: string | null
  nationality: string | null
  employment_type: string | null
  contract_type: string | null
  monthly_income: number | null
  has_pets: boolean | null
  smoker: boolean | null
  num_occupants: number | null
  extra_notes: string | null
  vida_laboral_csv_code: string | null
  safety_score: number | null
  document_status: DocumentStatus
  created_at: string
}

type ApplicationRow = {
  id: string
  status: string
  safety_score: number | null
  created_at: string
  listings: {
    id: string
    title: string
    address: string
    city: string
    monthly_rent: number
    status: string
  } | null
}

function ScoreBadge({ score }: { score: number }) {
  const color = score > 7 ? 'var(--success)' : score >= 4 ? 'var(--warning)' : 'var(--danger)'
  const bg    = score > 7 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : score >= 4 ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'color-mix(in srgb, var(--danger) 12%, transparent)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '5px 14px', borderRadius: '99px',
      background: bg, color, fontSize: '15px', fontWeight: 700, minWidth: '56px',
    }}>
      {score.toFixed(1)}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
        {value ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
      </span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslations('candidates.detail')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  const EMPLOYMENT_LABELS: Record<string, string> = {
    employed:      tc('employmentType.employed'),
    self_employed: tc('employmentType.self_employed'),
    student:       tc('employmentType.student'),
    retired:       tc('employmentType.retired'),
  }

  const CONTRACT_LABELS: Record<string, string> = {
    indefinido: tc('contractType.indefinido'),
    temporal:   tc('contractType.temporal'),
    autonomo:   tc('contractType.autonomo'),
  }

  const APP_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: tc('status.pending'),  color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)' },
    approved: { label: tc('status.approved'), color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' },
    rejected: { label: tc('status.rejected'), color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 12%, transparent)' },
  }

  const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
    verified:   tc('documentStatus.verified'),
    suspicious: tc('documentStatus.suspicious'),
    fraudulent: tc('documentStatus.fraudulent'),
  }

  const [
    { data: candidate, error: candidateError },
    { data: applicationsData },
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, phone, dni_nie, nationality, employment_type, contract_type, monthly_income, has_pets, smoker, num_occupants, extra_notes, vida_laboral_csv_code, safety_score, document_status, created_at')
      .eq('id', id)
      .single(),

    supabase
      .from('applications')
      .select('id, status, safety_score, created_at, listings(id, title, address, city, monthly_rent, status)')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (candidateError || !candidate) notFound()

  const c = candidate as Candidate
  const applications = (applicationsData ?? []) as unknown as ApplicationRow[]

  const maxAffordableRent = c.monthly_income ? c.monthly_income / 3 : null

  return (
    <div>
      {/* Back link */}
      <a href="/candidates" style={{ color: 'var(--text-tertiary)', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        {t('backToCandidates')}
      </a>

      {/* Header */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '28px 32px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>
            {c.full_name ?? t('unnamed')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{c.email ?? tc('dash')}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {t('registeredOn', { date: formatDate(c.created_at, locale) })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <DocumentStatusBadge status={c.document_status} label={DOC_STATUS_LABELS[c.document_status] ?? DOC_STATUS_LABELS.verified} />
          {c.safety_score != null ? (
            <div style={{ textAlign: 'center' }}>
              <ScoreBadge score={c.safety_score} />
              <p style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('safetyScore')}
              </p>
            </div>
          ) : (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontStyle: 'italic' }}>{t('scoreNotCalculated')}</span>
          )}
        </div>
      </div>

      {/* Grid 2 colonne: Dati personali + Situazione lavorativa */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        <Card title={t('personalDataTitle')}>
          <div style={{ marginTop: '8px' }}>
            <InfoRow label={t('phone')} value={c.phone} />
            <InfoRow label={t('dniNie')} value={c.dni_nie} />
            <InfoRow label={t('nationality')} value={c.nationality} />
          </div>
        </Card>

        <Card title={t('employmentTitle')}>
          <div style={{ marginTop: '8px' }}>
            <InfoRow
              label={t('employmentType')}
              value={c.employment_type ? (EMPLOYMENT_LABELS[c.employment_type] ?? c.employment_type) : null}
            />
            <InfoRow
              label={t('contractType')}
              value={c.contract_type ? (CONTRACT_LABELS[c.contract_type] ?? c.contract_type) : null}
            />
            <InfoRow
              label={t('monthlyIncome')}
              value={c.monthly_income != null ? formatCurrency(c.monthly_income, locale) : null}
            />
            <InfoRow
              label={t('maxAffordableRent')}
              value={maxAffordableRent != null
                ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(maxAffordableRent, locale)}{tc('perMonth')}</span>
                : null
              }
            />
          </div>
        </Card>
      </div>

      {/* Grid 2 colonne: Stile di vita + Documenti */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        <Card title={t('lifestyleTitle')}>
          <div style={{ marginTop: '8px' }}>
            <InfoRow
              label={t('pets')}
              value={c.has_pets == null ? null : (
                <span style={{ color: c.has_pets ? 'var(--warning)' : 'var(--success)' }}>
                  {c.has_pets ? tc('yes') : tc('no')}
                </span>
              )}
            />
            <InfoRow
              label={t('smoker')}
              value={c.smoker == null ? null : (
                <span style={{ color: c.smoker ? 'var(--warning)' : 'var(--success)' }}>
                  {c.smoker ? tc('yes') : tc('no')}
                </span>
              )}
            />
            <InfoRow
              label={t('occupants')}
              value={c.num_occupants != null ? String(c.num_occupants) : null}
            />
            {c.extra_notes && (
              <div style={{ paddingTop: '12px' }}>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('extraNotes')}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>{c.extra_notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card title={t('documentsTitle')}>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* CSV Vida Laboral */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('vidaLaboralCsv')}</span>
              {c.vida_laboral_csv_code ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                  color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                }}>
                  {t('present')}
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                  color: 'var(--text-tertiary)', background: 'color-mix(in srgb, var(--text-tertiary) 12%, transparent)',
                }}>
                  {t('absent')}
                </span>
              )}
            </div>
            {c.vida_laboral_csv_code && (
              <div>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '4px' }}>{t('code')}</p>
                <code style={{
                  display: 'block', color: 'var(--text-secondary)', background: 'var(--bg)',
                  padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                  letterSpacing: '0.08em', fontFamily: 'monospace', wordBreak: 'break-all',
                }}>
                  {c.vida_laboral_csv_code}
                </code>
              </div>
            )}

            {/* Upload documenti — mock (non implementati) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('uploadedDocsTitle')}
              </p>
              {[t('docContract'), t('docPayslip'), t('docIdentity')].map(doc => (
                <div key={doc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{doc}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontStyle: 'italic' }}>{t('uploadNotImplemented')}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Candidature — full width */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>{t('applicationsTitle')}</p>
          <span style={{
            background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)',
            borderRadius: '99px', padding: '2px 10px', fontSize: '12px', fontWeight: 600,
          }}>
            {applications.length}
          </span>
        </div>

        {applications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>{t('applicationsEmpty')}</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 130px 110px 90px 100px 80px',
              padding: '10px 24px', gap: '16px', borderBottom: '1px solid var(--border)',
            }}>
              {[t('colListing'), t('colRent'), t('colIncomeRatio'), t('colScore'), t('colStatus'), t('colReceived')].map((h, i) => (
                <span key={i} style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </span>
              ))}
            </div>

            {applications.map((app, i) => {
              const rent = app.listings?.monthly_rent
              const ratio = (c.monthly_income && rent) ? (c.monthly_income / rent) : null
              const statusCfg = APP_STATUS_CONFIG[app.status] ?? APP_STATUS_CONFIG.pending

              return (
                <div
                  key={app.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 130px 110px 90px 100px 80px',
                    padding: '16px 24px', gap: '16px', alignItems: 'center',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <div>
                    <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {app.listings?.title ?? tc('dash')}
                    </p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      {app.listings ? `${app.listings.address}, ${app.listings.city}` : ''}
                    </p>
                  </div>

                  <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {rent != null ? formatCurrency(rent, locale) : tc('dash')}
                  </p>

                  <div>
                    {ratio != null ? (
                      <>
                        <p style={{
                          color: ratio >= 3 ? 'var(--success)' : ratio >= 2 ? 'var(--warning)' : 'var(--danger)',
                          fontSize: '13px', fontWeight: 600,
                        }}>
                          {ratio.toFixed(1)}×
                        </p>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
                          {ratio >= 3 ? t('ratioGood') : ratio >= 2 ? t('ratioOk') : t('ratioLow')}
                        </p>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{tc('dash')}</span>
                    )}
                  </div>

                  <div>
                    {app.safety_score != null ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '3px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
                        color: app.safety_score > 7 ? 'var(--success)' : app.safety_score >= 4 ? 'var(--warning)' : 'var(--danger)',
                        background: app.safety_score > 7 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : app.safety_score >= 4 ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'color-mix(in srgb, var(--danger) 12%, transparent)',
                      }}>
                        {app.safety_score.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{tc('dash')}</span>
                    )}
                  </div>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                    color: statusCfg.color, background: statusCfg.bg,
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                    {statusCfg.label}
                  </span>

                  <div style={{ textAlign: 'right' }}>
                    {app.listings?.id && (
                      <a
                        href={`/listings/${app.listings.id}`}
                        style={{
                          color: 'var(--primary)', fontSize: '12px', fontWeight: 500,
                          textDecoration: 'none', padding: '5px 10px',
                          borderRadius: '6px', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                          display: 'inline-block', whiteSpace: 'nowrap',
                        }}
                      >
                        {t('listingLink')}
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

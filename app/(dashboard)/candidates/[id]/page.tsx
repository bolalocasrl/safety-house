import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed:     'Dipendente',
  self_employed: 'Autonomo / Libero professionista',
  student:      'Studente',
  retired:      'Pensionato',
}

const CONTRACT_LABELS: Record<string, string> = {
  indefinido: 'Tempo indeterminato',
  temporal:   'Tempo determinato',
  autonomo:   'Autonomo',
}

const APP_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'In attesa', color: '#1060E8', bg: 'rgba(16,96,232,0.12)'  },
  approved: { label: 'Approvato', color: '#1BA35A', bg: 'rgba(27,163,90,0.12)' },
  rejected: { label: 'Rifiutato', color: '#E83B2D', bg: 'rgba(232,59,45,0.12)' },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function ScoreBadge({ score }: { score: number }) {
  const color = score > 7 ? '#1BA35A' : score >= 4 ? '#E89210' : '#E83B2D'
  const bg    = score > 7 ? 'rgba(27,163,90,0.12)' : score >= 4 ? 'rgba(232,146,16,0.12)' : 'rgba(232,59,45,0.12)'
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2E3540' }}>
      <span style={{ color: '#6B7585', fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
        {value ?? <span style={{ color: '#6B7585' }}>—</span>}
      </span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '24px' }}>
      <p style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: candidate, error: candidateError },
    { data: applicationsData },
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, phone, dni_nie, nationality, employment_type, contract_type, monthly_income, has_pets, smoker, num_occupants, extra_notes, vida_laboral_csv_code, safety_score, created_at')
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
      <a href="/candidates" style={{ color: '#6B7585', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        ← Candidati
      </a>

      {/* Header */}
      <div style={{
        background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px',
        padding: '28px 32px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>
            {c.full_name ?? 'Candidato senza nome'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: '#9AA3B2', fontSize: '14px' }}>{c.email ?? '—'}</span>
            <span style={{ color: '#2E3540' }}>·</span>
            <span style={{ color: '#6B7585', fontSize: '13px' }}>
              Registrato il {new Date(c.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {c.safety_score != null ? (
            <div style={{ textAlign: 'center' }}>
              <ScoreBadge score={c.safety_score} />
              <p style={{ color: '#6B7585', fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Safety Score
              </p>
            </div>
          ) : (
            <span style={{ color: '#6B7585', fontSize: '13px', fontStyle: 'italic' }}>Score non calcolato</span>
          )}
        </div>
      </div>

      {/* Grid 2 colonne: Dati personali + Situazione lavorativa */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        <Card title="Dati personali">
          <div style={{ marginTop: '8px' }}>
            <InfoRow label="Telefono"    value={c.phone} />
            <InfoRow label="DNI / NIE"   value={c.dni_nie} />
            <InfoRow label="Nazionalità" value={c.nationality} />
          </div>
        </Card>

        <Card title="Situazione lavorativa">
          <div style={{ marginTop: '8px' }}>
            <InfoRow
              label="Tipo di impiego"
              value={c.employment_type ? (EMPLOYMENT_LABELS[c.employment_type] ?? c.employment_type) : null}
            />
            <InfoRow
              label="Tipo di contratto"
              value={c.contract_type ? (CONTRACT_LABELS[c.contract_type] ?? c.contract_type) : null}
            />
            <InfoRow
              label="Reddito mensile netto"
              value={c.monthly_income != null ? formatCurrency(c.monthly_income) : null}
            />
            <InfoRow
              label="Affitto max sostenibile (÷3)"
              value={maxAffordableRent != null
                ? <span style={{ color: '#1BA35A', fontWeight: 600 }}>{formatCurrency(maxAffordableRent)}/mese</span>
                : null
              }
            />
          </div>
        </Card>
      </div>

      {/* Grid 2 colonne: Stile di vita + Documenti */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        <Card title="Stile di vita">
          <div style={{ marginTop: '8px' }}>
            <InfoRow
              label="Animali domestici"
              value={c.has_pets == null ? null : (
                <span style={{ color: c.has_pets ? '#E89210' : '#1BA35A' }}>
                  {c.has_pets ? 'Sì' : 'No'}
                </span>
              )}
            />
            <InfoRow
              label="Fumatore"
              value={c.smoker == null ? null : (
                <span style={{ color: c.smoker ? '#E89210' : '#1BA35A' }}>
                  {c.smoker ? 'Sì' : 'No'}
                </span>
              )}
            />
            <InfoRow
              label="Numero occupanti"
              value={c.num_occupants != null ? String(c.num_occupants) : null}
            />
            {c.extra_notes && (
              <div style={{ paddingTop: '12px' }}>
                <p style={{ color: '#6B7585', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Note aggiuntive
                </p>
                <p style={{ color: '#9AA3B2', fontSize: '13px', lineHeight: '1.6' }}>{c.extra_notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Documenti">
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* CSV Vida Laboral */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9AA3B2', fontSize: '13px' }}>CSV Vida Laboral</span>
              {c.vida_laboral_csv_code ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                  color: '#1BA35A', background: 'rgba(27,163,90,0.12)',
                }}>
                  ✓ Presente
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                  color: '#6B7585', background: 'rgba(107,117,133,0.12)',
                }}>
                  Assente
                </span>
              )}
            </div>
            {c.vida_laboral_csv_code && (
              <div>
                <p style={{ color: '#6B7585', fontSize: '11px', marginBottom: '4px' }}>Codice</p>
                <code style={{
                  display: 'block', color: '#9AA3B2', background: '#0D1117',
                  padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                  letterSpacing: '0.08em', fontFamily: 'monospace', wordBreak: 'break-all',
                }}>
                  {c.vida_laboral_csv_code}
                </code>
              </div>
            )}

            {/* Upload documenti — mock (non implementati) */}
            <div style={{ borderTop: '1px solid #2E3540', paddingTop: '12px' }}>
              <p style={{ color: '#6B7585', fontSize: '11px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Documenti caricati
              </p>
              {(['Contratto di lavoro', 'Ultima nómina', 'Documento identità'] as const).map(doc => (
                <div key={doc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#9AA3B2', fontSize: '12px' }}>{doc}</span>
                  <span style={{ color: '#6B7585', fontSize: '11px', fontStyle: 'italic' }}>Upload non ancora implementato</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Candidature — full width */}
      <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #2E3540',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>Candidature</p>
          <span style={{
            background: 'rgba(16,96,232,0.12)', color: '#1060E8',
            borderRadius: '99px', padding: '2px 10px', fontSize: '12px', fontWeight: 600,
          }}>
            {applications.length}
          </span>
        </div>

        {applications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: '#6B7585', fontSize: '14px' }}>Nessuna candidatura</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 130px 110px 90px 100px 80px',
              padding: '10px 24px', gap: '16px', borderBottom: '1px solid #2E3540',
            }}>
              {['Annuncio', 'Affitto', 'Ratio reddito', 'Score', 'Stato', 'Ricevuta'].map(h => (
                <span key={h} style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                    borderTop: i === 0 ? 'none' : '1px solid #2E3540',
                  }}
                >
                  <div>
                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {app.listings?.title ?? '—'}
                    </p>
                    <p style={{ color: '#6B7585', fontSize: '12px' }}>
                      {app.listings ? `${app.listings.address}, ${app.listings.city}` : ''}
                    </p>
                  </div>

                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {rent != null ? formatCurrency(rent) : '—'}
                  </p>

                  <div>
                    {ratio != null ? (
                      <>
                        <p style={{
                          color: ratio >= 3 ? '#1BA35A' : ratio >= 2 ? '#E89210' : '#E83B2D',
                          fontSize: '13px', fontWeight: 600,
                        }}>
                          {ratio.toFixed(1)}×
                        </p>
                        <p style={{ color: '#6B7585', fontSize: '11px' }}>
                          {ratio >= 3 ? 'Ottimo' : ratio >= 2 ? 'Sufficiente' : 'Insufficiente'}
                        </p>
                      </>
                    ) : (
                      <span style={{ color: '#6B7585', fontSize: '13px' }}>—</span>
                    )}
                  </div>

                  <div>
                    {app.safety_score != null ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '3px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
                        color: app.safety_score > 7 ? '#1BA35A' : app.safety_score >= 4 ? '#E89210' : '#E83B2D',
                        background: app.safety_score > 7 ? 'rgba(27,163,90,0.12)' : app.safety_score >= 4 ? 'rgba(232,146,16,0.12)' : 'rgba(232,59,45,0.12)',
                      }}>
                        {app.safety_score.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: '#6B7585', fontSize: '13px' }}>—</span>
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
                          color: '#1060E8', fontSize: '12px', fontWeight: 500,
                          textDecoration: 'none', padding: '5px 10px',
                          borderRadius: '6px', border: '1px solid rgba(16,96,232,0.3)',
                          display: 'inline-block', whiteSpace: 'nowrap',
                        }}
                      >
                        Annuncio
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

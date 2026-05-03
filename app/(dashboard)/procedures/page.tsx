import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

type ProcedureRow = {
  id: string
  step_current: number
  status: string
  created_at: string
  candidates: { full_name: string | null; email: string | null } | null
  listings: { title: string; address: string; city: string } | null
}

const STEP_LABELS: Record<number, string> = {
  1: 'Seguro de Impago',
  2: 'Contratto',
  3: 'Firma Digitale',
  4: 'Incasòl',
  5: 'Archiviazione',
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          height: '68px', background: '#1C2230',
          borderRadius: i === 0 ? '12px 12px 0 0' : i === 2 ? '0 0 12px 12px' : '0',
          opacity: 1 - i * 0.2,
        }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: '#1C2230', border: '1px solid #2E3540',
      borderRadius: '12px', padding: '64px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '12px',
        background: 'rgba(232,146,16,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', fontSize: '28px',
      }}>
        📋
      </div>
      <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Nessun procedimento ancora
      </h2>
      <p style={{ color: '#6B7585', fontSize: '14px', maxWidth: '360px', margin: '0 auto 28px' }}>
        Avvia un procedimento dalla scheda di un annuncio selezionando il candidato vincitore.
      </p>
      <a href="/listings" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: '#1060E8', color: '#fff',
        padding: '10px 20px', borderRadius: '8px',
        textDecoration: 'none', fontSize: '14px', fontWeight: 500,
      }}>
        Vai agli annunci
      </a>
    </div>
  )
}

async function ProceduresTable() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user!.id)
    .single()

  const agencyId = userData?.agency_id ?? null
  if (!agencyId) return <EmptyState />

  const { data: procedures, error } = await supabase
    .from('procedures')
    .select('id, step_current, status, created_at, candidates(full_name, email), listings(title, address, city)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{
        background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
        borderRadius: '12px', padding: '20px 24px', color: '#f87171', fontSize: '14px',
      }}>
        Errore nel caricamento dei procedimenti. Riprova tra qualche istante.
      </div>
    )
  }

  const rows = (procedures ?? []) as unknown as ProcedureRow[]
  if (rows.length === 0) return <EmptyState />

  const COLS = '1fr 180px 160px 120px 100px 80px'

  return (
    <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '12px 24px', gap: '16px', borderBottom: '1px solid #2E3540' }}>
        {['Candidato', 'Annuncio', 'Fase corrente', 'Stato', 'Avviato il', ''].map(h => (
          <span key={h} style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {h}
          </span>
        ))}
      </div>

      {rows.map((proc, i) => {
        const isCompleted = proc.status === 'completed'
        const stepLabel = STEP_LABELS[proc.step_current] ?? `Fase ${proc.step_current}`
        const stepPct = Math.round((proc.step_current / 5) * 100)

        return (
          <div
            key={proc.id}
            style={{
              display: 'grid', gridTemplateColumns: COLS,
              padding: '16px 24px', gap: '16px', alignItems: 'center',
              borderTop: i === 0 ? 'none' : '1px solid #2E3540',
            }}
          >
            <div>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proc.candidates?.full_name ?? '—'}
              </p>
              <p style={{ color: '#6B7585', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proc.candidates?.email ?? ''}
              </p>
            </div>

            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: '#9AA3B2', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proc.listings?.title ?? '—'}
              </p>
              <p style={{ color: '#6B7585', fontSize: '12px' }}>
                {proc.listings?.city ?? ''}
              </p>
            </div>

            <div>
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                {isCompleted ? 'Completato' : `${proc.step_current}/5 — ${stepLabel}`}
              </p>
              <div style={{ height: '4px', background: '#2E3540', borderRadius: '2px', width: '100%' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: isCompleted ? '#1BA35A' : '#1060E8',
                  width: isCompleted ? '100%' : `${stepPct}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
              color: isCompleted ? '#1BA35A' : '#1060E8',
              background: isCompleted ? 'rgba(27,163,90,0.12)' : 'rgba(16,96,232,0.12)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
              {isCompleted ? 'Completato' : 'In corso'}
            </span>

            <p style={{ color: '#6B7585', fontSize: '12px' }}>
              {new Date(proc.created_at).toLocaleDateString('it-IT')}
            </p>

            <div style={{ textAlign: 'right' }}>
              <a
                href={`/procedures/${proc.id}`}
                style={{
                  color: '#1060E8', fontSize: '13px', fontWeight: 500,
                  textDecoration: 'none', padding: '6px 12px',
                  borderRadius: '6px', border: '1px solid rgba(16,96,232,0.3)',
                  display: 'inline-block', whiteSpace: 'nowrap',
                }}
              >
                Apri
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ProceduresPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          Procedimenti
        </h1>
        <p style={{ color: '#6B7585', fontSize: '14px' }}>
          Workflow post-selezione: dalla polizza all'archiviazione
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ProceduresTable />
      </Suspense>
    </div>
  )
}

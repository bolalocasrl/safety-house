import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

type Candidate = {
  id: string
  full_name: string | null
  email: string | null
  contract_type: string | null
  monthly_income: number | null
  safety_score: number | null
  created_at: string
  applications_count: number
}

const CONTRACT_LABELS: Record<string, string> = {
  indefinido: 'Indeterminato',
  temporal:   'Determinato',
  autonomo:   'Autonomo',
}

function formatIncome(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function ScoreBadge({ score }: { score: number }) {
  const color = score > 7 ? '#1BA35A' : score >= 4 ? '#E89210' : '#E83B2D'
  const bg    = score > 7 ? 'rgba(27,163,90,0.12)' : score >= 4 ? 'rgba(232,146,16,0.12)' : 'rgba(232,59,45,0.12)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 10px', borderRadius: '99px',
      background: bg, color, fontSize: '13px', fontWeight: 700, minWidth: '48px',
    }}>
      {score.toFixed(1)}
    </span>
  )
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          height: '68px',
          background: '#1C2230',
          borderRadius: i === 0 ? '12px 12px 0 0' : i === 3 ? '0 0 12px 12px' : '0',
          opacity: 1 - i * 0.18,
        }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: '#1C2230',
      border: '1px solid #2E3540',
      borderRadius: '12px',
      padding: '64px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '12px',
        background: 'rgba(16,96,232,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', fontSize: '28px',
      }}>
        👥
      </div>
      <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Nessun candidato ancora
      </h2>
      <p style={{ color: '#6B7585', fontSize: '14px', maxWidth: '360px', margin: '0 auto 28px' }}>
        I candidati appariranno qui non appena invieranno una candidatura tramite il link pubblico di un annuncio.
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

async function CandidatesTable() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user!.id)
    .single()

  const agencyId = userData?.agency_id ?? null

  if (!agencyId) return <EmptyState />

  // Listing IDs dell'agenzia
  const { data: agencyListings } = await supabase
    .from('listings')
    .select('id')
    .eq('agency_id', agencyId)

  const listingIds = (agencyListings ?? []).map(l => l.id)

  if (listingIds.length === 0) return <EmptyState />

  // Tutte le applications per questi listing, con i dati del candidato
  const { data: applications, error } = await supabase
    .from('applications')
    .select('candidate_id, candidates(id, full_name, email, contract_type, monthly_income, safety_score, created_at)')
    .in('listing_id', listingIds)

  if (error) {
    return (
      <div style={{
        background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
        borderRadius: '12px', padding: '20px 24px', color: '#f87171', fontSize: '14px',
      }}>
        Errore nel caricamento dei candidati. Riprova tra qualche istante.
      </div>
    )
  }

  // Aggrega: un record per candidato, conta le candidature
  const candidateMap = new Map<string, Candidate>()
  for (const app of applications ?? []) {
    const c = app.candidates as unknown as Candidate | null
    if (!c) continue
    if (candidateMap.has(c.id)) {
      candidateMap.get(c.id)!.applications_count++
    } else {
      candidateMap.set(c.id, { ...c, applications_count: 1 })
    }
  }

  const candidates = Array.from(candidateMap.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (candidates.length === 0) return <EmptyState />

  const COLS = '1fr 180px 150px 90px 100px 100px 90px'

  return (
    <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '12px 24px', gap: '16px', borderBottom: '1px solid #2E3540' }}>
        {['Candidato', 'Email', 'Contratto / Reddito', 'Score', 'Candidature', 'Registrato', ''].map(h => (
          <span key={h} style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {candidates.map((c, i) => (
        <div
          key={c.id}
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            padding: '16px 24px',
            gap: '16px',
            alignItems: 'center',
            borderTop: i === 0 ? 'none' : '1px solid #2E3540',
          }}
        >
          {/* Nome */}
          <div>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.full_name ?? '—'}
            </p>
          </div>

          {/* Email */}
          <p style={{ color: '#9AA3B2', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.email ?? '—'}
          </p>

          {/* Contratto / Reddito */}
          <div>
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
              {c.contract_type ? (CONTRACT_LABELS[c.contract_type] ?? c.contract_type) : '—'}
            </p>
            <p style={{ color: '#6B7585', fontSize: '12px' }}>
              {c.monthly_income != null ? formatIncome(c.monthly_income) + '/mese' : '—'}
            </p>
          </div>

          {/* Score */}
          <div>
            {c.safety_score != null
              ? <ScoreBadge score={c.safety_score} />
              : <span style={{ color: '#6B7585', fontSize: '13px' }}>—</span>
            }
          </div>

          {/* Candidature */}
          <div>
            <span style={{
              background: 'rgba(16,96,232,0.12)', color: '#1060E8',
              borderRadius: '99px', padding: '3px 10px',
              fontSize: '12px', fontWeight: 600,
            }}>
              {c.applications_count}
            </span>
          </div>

          {/* Registrato */}
          <p style={{ color: '#6B7585', fontSize: '12px' }}>
            {new Date(c.created_at).toLocaleDateString('it-IT')}
          </p>

          {/* Azione */}
          <div style={{ textAlign: 'right' }}>
            <a
              href={`/candidates/${c.id}`}
              style={{
                color: '#1060E8', fontSize: '13px', fontWeight: 500,
                textDecoration: 'none', padding: '6px 12px',
                borderRadius: '6px', border: '1px solid rgba(16,96,232,0.3)',
                display: 'inline-block', whiteSpace: 'nowrap',
              }}
            >
              Vedi profilo
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CandidatesPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          Candidati
        </h1>
        <p style={{ color: '#6B7585', fontSize: '14px' }}>
          Tutti i candidati che hanno fatto richiesta su un tuo annuncio
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CandidatesTable />
      </Suspense>
    </div>
  )
}

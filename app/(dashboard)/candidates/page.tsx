import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'

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

function ScoreBadge({ score }: { score: number }) {
  const color = score > 7 ? 'var(--success)' : score >= 4 ? 'var(--warning)' : 'var(--danger)'
  const bg    = score > 7 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : score >= 4 ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'color-mix(in srgb, var(--danger) 12%, transparent)'
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
          background: 'var(--surface)',
          borderRadius: i === 0 ? '12px 12px 0 0' : i === 3 ? '0 0 12px 12px' : '0',
          opacity: 1 - i * 0.18,
        }} />
      ))}
    </div>
  )
}

async function EmptyState() {
  const t = await getTranslations('candidates.list')
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '64px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '12px',
        background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', fontSize: '28px',
      }}>
        👥
      </div>
      <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        {t('emptyTitle')}
      </h2>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', maxWidth: '360px', margin: '0 auto 28px' }}>
        {t('emptyDesc')}
      </p>
      <a href="/listings" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: 'var(--primary)', color: 'var(--primary-foreground)',
        padding: '10px 20px', borderRadius: '8px',
        textDecoration: 'none', fontSize: '14px', fontWeight: 500,
      }}>
        {t('emptyCta')}
      </a>
    </div>
  )
}

async function CandidatesTable() {
  const supabase = await createClient()
  const t = await getTranslations('candidates.list')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  const CONTRACT_LABELS: Record<string, string> = {
    indefinido: tc('contractType.indefinido'),
    temporal:   tc('contractType.temporal'),
    autonomo:   tc('contractType.autonomo'),
  }

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
        background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
        borderRadius: '12px', padding: '20px 24px', color: 'var(--danger)', fontSize: '14px',
      }}>
        {t('error')}
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '12px 24px', gap: '16px', borderBottom: '1px solid var(--border)' }}>
        {[t('colCandidate'), t('colEmail'), t('colContractIncome'), t('colScore'), t('colApplications'), t('colRegistered'), ''].map((h, i) => (
          <span key={i} style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}
        >
          {/* Nome */}
          <div>
            <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.full_name ?? tc('dash')}
            </p>
          </div>

          {/* Email */}
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.email ?? tc('dash')}
          </p>

          {/* Contratto / Reddito */}
          <div>
            <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
              {c.contract_type ? (CONTRACT_LABELS[c.contract_type] ?? c.contract_type) : tc('dash')}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {c.monthly_income != null ? formatCurrency(c.monthly_income, locale) + tc('perMonth') : tc('dash')}
            </p>
          </div>

          {/* Score */}
          <div>
            {c.safety_score != null
              ? <ScoreBadge score={c.safety_score} />
              : <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{tc('dash')}</span>
            }
          </div>

          {/* Candidature */}
          <div>
            <span style={{
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)',
              borderRadius: '99px', padding: '3px 10px',
              fontSize: '12px', fontWeight: 600,
            }}>
              {c.applications_count}
            </span>
          </div>

          {/* Registrato */}
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
            {formatDate(c.created_at, locale)}
          </p>

          {/* Azione */}
          <div style={{ textAlign: 'right' }}>
            <a
              href={`/candidates/${c.id}`}
              style={{
                color: 'var(--primary)', fontSize: '13px', fontWeight: 500,
                textDecoration: 'none', padding: '6px 12px',
                borderRadius: '6px', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                display: 'inline-block', whiteSpace: 'nowrap',
              }}
            >
              {t('viewProfile')}
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function CandidatesPage() {
  const t = await getTranslations('candidates.list')

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          {t('title')}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
          {t('subtitle')}
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CandidatesTable />
      </Suspense>
    </div>
  )
}

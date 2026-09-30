import { Suspense } from 'react'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'
import { DocumentStatusBadge, type DocumentStatus } from '@/components/document-status-badge'
import { IconaCandidati, IconaFreccia } from '@/components/icone'
import { ElencoRighe } from '@/components/scheletro'

type Candidate = {
  id: string
  full_name: string | null
  email: string | null
  contract_type: string | null
  monthly_income: number | null
  safety_score: number | null
  document_status: DocumentStatus
  created_at: string
  applications_count: number
}

// Nome ed email stanno insieme nella stessa colonna: otto colonne separate non
// entravano nella larghezza della pagina e si schiacciavano a vicenda.
const COLONNE = 'md:grid-cols-[1fr_150px_80px_130px_80px_100px_24px]'

function ScoreBadge({ score }: { score: number }) {
  const tinta = score > 7
    ? 'text-success bg-success/12'
    : score >= 4
      ? 'text-warning bg-warning/12'
      : 'text-danger bg-danger/12'
  return (
    <span className={`inline-flex min-w-12 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[13px] font-bold ${tinta}`}>
      {score.toFixed(1)}
    </span>
  )
}

async function EmptyState() {
  const t = await getTranslations('candidates.list')
  return (
    <div className="bg-surface border-border sh-scheda rounded-xl border px-6 py-14 text-center">
      <div className="bg-primary/10 text-primary mx-auto mb-5 inline-flex rounded-2xl p-4">
        <IconaCandidati className="h-7 w-7" />
      </div>
      <h2 className="text-text text-lg font-semibold">{t('emptyTitle')}</h2>
      <p className="text-text-tertiary mx-auto mt-2 max-w-sm text-sm">{t('emptyDesc')}</p>
      <Link
        href="/listings"
        className="bg-primary text-primary-foreground mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm"
      >
        {t('emptyCta')}
      </Link>
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

  const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
    verified:   tc('documentStatus.verified'),
    suspicious: tc('documentStatus.suspicious'),
    fraudulent: tc('documentStatus.fraudulent'),
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
    .select('candidate_id, candidates(id, full_name, email, contract_type, monthly_income, safety_score, document_status, created_at)')
    .in('listing_id', listingIds)

  if (error) {
    return (
      <div className="border-danger/35 bg-danger/10 text-danger rounded-xl border px-5 py-4 text-sm">
        {t('error')}
      </div>
    )
  }

  // Aggrega: un record per candidato, conta le candidature
  const candidateMap = new Map<string, Candidate>()
  for (const app of applications ?? []) {
    const c = app.candidates as unknown as Candidate | null
    if (!c) continue
    const esistente = candidateMap.get(c.id)
    if (esistente) {
      esistente.applications_count++
    } else {
      candidateMap.set(c.id, { ...c, applications_count: 1 })
    }
  }

  // Classifica candidati verificati: punteggio più alto in cima, i non ancora
  // valutati in coda (non sono "peggiori", semplicemente non hanno ancora uno score).
  const candidates = Array.from(candidateMap.values())
    .sort((a, b) => {
      if (a.safety_score == null && b.safety_score == null) return 0
      if (a.safety_score == null) return 1
      if (b.safety_score == null) return -1
      return b.safety_score - a.safety_score
    })

  if (candidates.length === 0) return <EmptyState />

  return (
    <div className="bg-surface border-border sh-scheda overflow-hidden rounded-xl border md:flex md:min-h-0 md:flex-1 md:flex-col">
      <div className={`border-border text-text-tertiary hidden gap-4 border-b px-5 py-3 text-[11px] font-semibold tracking-wider uppercase md:grid ${COLONNE}`}>
        <span>{t('colCandidate')}</span>
        <span>{t('colContractIncome')}</span>
        <span>{t('colScore')}</span>
        <span>{t('colDocument')}</span>
        <span>{t('colApplications')}</span>
        <span>{t('colRegistered')}</span>
        <span />
      </div>

      <div className="divide-border divide-y md:min-h-0 md:flex-1 md:overflow-y-auto">
        {candidates.map(c => (
          <Link
            key={c.id}
            href={`/candidates/${c.id}`}
            className={`hover:bg-primary-subtle/50 group grid grid-cols-1 gap-2 px-5 py-4 transition-colors md:items-center md:gap-4 ${COLONNE}`}
          >
            <div className="min-w-0">
              <p className="text-text truncate text-sm font-medium">{c.full_name ?? tc('dash')}</p>
              <p className="text-text-tertiary mt-0.5 truncate text-xs">{c.email ?? tc('dash')}</p>
            </div>

            <div className="min-w-0">
              <p className="text-text truncate text-[13px] font-medium">
                {c.contract_type ? (CONTRACT_LABELS[c.contract_type] ?? c.contract_type) : tc('dash')}
              </p>
              <p className="text-text-tertiary mt-0.5 truncate text-xs">
                {c.monthly_income != null ? formatCurrency(c.monthly_income, locale) + tc('perMonth') : tc('dash')}
              </p>
            </div>

            {/* Su schermo largo md:contents scioglie il contenitore e i figli
                entrano nelle colonne; su telefono restano su una riga sola. */}
            <div className="flex flex-wrap items-center gap-3 md:contents">
              {c.safety_score != null
                ? <ScoreBadge score={c.safety_score} />
                : <span className="text-text-tertiary shrink-0 text-[13px]">{tc('dash')}</span>}

              <DocumentStatusBadge
                status={c.document_status}
                label={DOC_STATUS_LABELS[c.document_status] ?? DOC_STATUS_LABELS.verified}
              />

              <span className="bg-primary/10 text-primary inline-flex shrink-0 justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold">
                {c.applications_count}
              </span>

              <p className="text-text-tertiary shrink-0 text-xs whitespace-nowrap">
                {formatDate(c.created_at, locale)}
              </p>

              <IconaFreccia
                aria-label={t('viewProfile')}
                className="text-text-tertiary ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 md:ml-0 md:justify-self-end"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function CandidatesPage() {
  const t = await getTranslations('candidates.list')

  return (
    <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">
      <header className="mb-8 shrink-0">
        <h1 className="text-text text-[26px] font-bold tracking-tight md:text-[34px]">{t('title')}</h1>
        <p className="text-text-tertiary mt-1 text-sm">{t('subtitle')}</p>
      </header>

      <Suspense fallback={<ElencoRighe righe={5} testata={false} />}>
        <CandidatesTable />
      </Suspense>
    </div>
  )
}

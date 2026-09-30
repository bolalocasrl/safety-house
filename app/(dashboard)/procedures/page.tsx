import { Suspense } from 'react'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { IconaProcedimenti, IconaFreccia } from '@/components/icone'
import { ElencoRighe } from '@/components/scheletro'

type ProcedureRow = {
  id: string
  step_current: number
  status: string
  created_at: string
  candidates: { full_name: string | null; email: string | null } | null
  listings: { title: string; address: string; city: string } | null
}

const COLONNE = 'md:grid-cols-[1fr_180px_170px_130px_100px_24px]'

async function EmptyState() {
  const t = await getTranslations('procedures.list')
  return (
    <div className="bg-surface border-border sh-scheda rounded-xl border px-6 py-14 text-center">
      <div className="bg-warning/12 text-warning mx-auto mb-5 inline-flex rounded-2xl p-4">
        <IconaProcedimenti className="h-7 w-7" />
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

async function ProceduresTable() {
  const supabase = await createClient()
  const t = await getTranslations('procedures.list')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  const STEP_LABELS: Record<number, string> = {
    1: tc('procedureSteps.1'),
    2: tc('procedureSteps.2'),
    3: tc('procedureSteps.3'),
    4: tc('procedureSteps.4'),
    5: tc('procedureSteps.5'),
  }

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
      <div className="border-danger/35 bg-danger/10 text-danger rounded-xl border px-5 py-4 text-sm">
        {t('error')}
      </div>
    )
  }

  const rows = (procedures ?? []) as unknown as ProcedureRow[]
  if (rows.length === 0) return <EmptyState />

  return (
    <div className="bg-surface border-border sh-scheda overflow-hidden rounded-xl border md:flex md:min-h-0 md:flex-1 md:flex-col">
      <div className={`border-border text-text-tertiary hidden gap-4 border-b px-5 py-3 text-[11px] font-semibold tracking-wider uppercase md:grid ${COLONNE}`}>
        <span>{t('colCandidate')}</span>
        <span>{t('colListing')}</span>
        <span>{t('colCurrentStep')}</span>
        <span>{t('colStatus')}</span>
        <span>{t('colStarted')}</span>
        <span />
      </div>

      <div className="divide-border divide-y md:min-h-0 md:flex-1 md:overflow-y-auto">
        {rows.map(proc => {
          const concluso = proc.status === 'completed'
          const etichettaPasso = STEP_LABELS[proc.step_current] ?? String(proc.step_current)
          const percentuale = concluso ? 100 : Math.round((proc.step_current / 5) * 100)

          return (
            <Link
              key={proc.id}
              href={`/procedures/${proc.id}`}
              className={`hover:bg-primary-subtle/50 group grid grid-cols-1 gap-2 px-5 py-4 transition-colors md:items-center md:gap-4 ${COLONNE}`}
            >
              <div className="min-w-0">
                <p className="text-text truncate text-sm font-medium">
                  {proc.candidates?.full_name ?? tc('dash')}
                </p>
                <p className="text-text-tertiary mt-0.5 truncate text-xs">
                  {proc.candidates?.email ?? ''}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-text-secondary truncate text-[13px]">
                  {proc.listings?.title ?? tc('dash')}
                </p>
                <p className="text-text-tertiary mt-0.5 truncate text-xs">
                  {proc.listings?.city ?? ''}
                </p>
              </div>

              {/* Avanzamento: il passo in parole più la barra. Tiene la sua
                  colonna anche su telefono, dove la barra a piena larghezza
                  si legge meglio di un numero. */}
              <div className="min-w-0">
                <p className="text-text mb-1.5 truncate text-[13px] font-medium">
                  {concluso ? t('completed') : t('stepProgress', { step: proc.step_current, label: etichettaPasso })}
                </p>
                <div className="bg-border h-1 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${concluso ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${percentuale}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:contents">
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    concluso ? 'text-success bg-success/12' : 'text-primary bg-primary/12'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                  {concluso ? tc('status.completed') : tc('status.inProgress')}
                </span>

                <p className="text-text-tertiary shrink-0 text-xs whitespace-nowrap">
                  {formatDate(proc.created_at, locale)}
                </p>

                <IconaFreccia
                  aria-label={t('open')}
                  className="text-text-tertiary ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 md:ml-0 md:justify-self-end"
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default async function ProceduresPage() {
  const t = await getTranslations('procedures.list')

  return (
    <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">
      <header className="mb-8 shrink-0">
        <h1 className="text-text text-[26px] font-bold tracking-tight md:text-[34px]">{t('title')}</h1>
        <p className="text-text-tertiary mt-1 text-sm">{t('subtitle')}</p>
      </header>

      <Suspense fallback={<ElencoRighe righe={3} testata={false} />}>
        <ProceduresTable />
      </Suspense>
    </div>
  )
}

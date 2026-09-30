import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'
import {
  IconaAnnunci,
  IconaCandidati,
  IconaProcedimenti,
  IconaFreccia,
  IconaPiu,
} from '@/components/icone'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('dashboard')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  // Recupera agency_id dell'agente loggato
  const { data: userData } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user!.id)
    .single()

  const agencyId = userData?.agency_id ?? null

  // Query parallele: contatori + ultimi 3 annunci attivi
  const [
    { count: activeListingsCount, error: erroreAnnunciAttivi },
    { data: agencyListingIds, error: erroreElencoAnnunci },
    { data: recentListings, error: erroreUltimiAnnunci },
    { count: activeProceduresCount, error: erroreProcedimenti },
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('agency_id', agencyId ?? ''),

    supabase
      .from('listings')
      .select('id')
      .eq('agency_id', agencyId ?? ''),

    supabase
      .from('listings')
      .select('id, title, address, city, monthly_rent, applications(count)')
      .eq('status', 'active')
      .eq('agency_id', agencyId ?? '')
      .order('created_at', { ascending: false })
      .limit(3),

    supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId ?? '')
      .neq('status', 'completed'),
  ])

  // Conta tutte le candidature per le listings dell'agenzia
  const listingIds = (agencyListingIds ?? []).map(l => l.id)
  const { count: applicationsCount, error: erroreCandidature } = listingIds.length > 0
    ? await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('listing_id', listingIds)
    : { count: 0, error: null }

  // Se una qualsiasi lettura fallisce va detto. Prima l'esito non veniva
  // guardato: un errore del database diventava un tranquillo "0 annunci,
  // 0 candidature", indistinguibile da un'agenzia che non ha ancora
  // inserito nulla — e l'agente avrebbe pensato di aver perso i dati.
  const erroreCaricamento =
    erroreAnnunciAttivi ?? erroreElencoAnnunci ?? erroreUltimiAnnunci ??
    erroreProcedimenti ?? erroreCandidature

  if (erroreCaricamento) {
    console.error('[dashboard] lettura fallita:', erroreCaricamento.message)
    return (
      <div>
        <h1 className="text-text text-2xl font-bold tracking-tight md:text-[28px]">{t('title')}</h1>
        <div className="border-danger/35 bg-danger/10 text-danger mt-6 rounded-xl border px-5 py-4 text-sm">
          {t('error')}
        </div>
      </div>
    )
  }

  const contatori = [
    {
      etichetta: t('statActiveListings'),
      valore: activeListingsCount ?? 0,
      Icona: IconaAnnunci,
      tinta: 'text-primary bg-primary/10',
    },
    {
      etichetta: t('statApplications'),
      valore: applicationsCount ?? 0,
      Icona: IconaCandidati,
      tinta: 'text-success bg-success/10',
    },
    {
      etichetta: t('statProcedures'),
      valore: activeProceduresCount ?? 0,
      Icona: IconaProcedimenti,
      tinta: 'text-warning bg-warning/10',
    },
  ]

  const hasActiveListings = (recentListings ?? []).length > 0

  return (
    <div>
      {/* Intestazione: titolo a sinistra, azione principale a destra.
          Su schermo stretto il bottone va a capo sotto il titolo. */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-text text-2xl font-bold tracking-tight md:text-[28px]">
            {t('title')}
          </h1>
          <p className="text-text-tertiary mt-1 truncate text-sm">
            {t('welcome', { email: user?.email ?? '' })}
          </p>
        </div>

        <Link
          href="/listings/new"
          className="bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm"
        >
          <IconaPiu className="h-4 w-4" />
          {t('createListing')}
        </Link>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {contatori.map(({ etichetta, valore, Icona, tinta }) => (
          <div
            key={etichetta}
            className="bg-surface border-border rounded-xl border p-5"
          >
            <div className={`mb-4 inline-flex rounded-lg p-2 ${tinta}`}>
              <Icona className="h-[18px] w-[18px]" />
            </div>
            <div className="text-text text-[32px] leading-none font-bold [font-family:var(--font-sora)]">
              {valore}
            </div>
            <div className="text-text-tertiary mt-2 text-sm">
              {etichetta}
            </div>
          </div>
        ))}
      </div>

      {hasActiveListings ? (
        <section className="bg-surface border-border overflow-hidden rounded-xl border">
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-text text-[15px] font-semibold">
              {t('recentListingsTitle')}
            </h2>
            <Link
              href="/listings"
              className="text-primary inline-flex items-center gap-1 text-[13px] font-medium"
            >
              {t('viewAll')}
              <IconaFreccia className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-border divide-y">
            {(recentListings ?? []).map(listing => {
              const appCount = (listing.applications as { count: number }[])[0]?.count ?? 0
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="hover:bg-primary-subtle/50 group flex items-center gap-4 px-5 py-4 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-medium">
                      {listing.title}
                    </p>
                    <p className="text-text-tertiary mt-0.5 truncate text-xs">
                      {listing.address}, {listing.city} · {formatCurrency(listing.monthly_rent, locale)}{tc('perMonth')}
                    </p>
                  </div>

                  <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
                    {t('applicationsCount', { count: appCount })}
                  </span>

                  <IconaFreccia className="text-text-tertiary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="bg-surface border-border rounded-xl border px-6 py-14 text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-5 inline-flex rounded-2xl p-4">
            <IconaAnnunci className="h-7 w-7" />
          </div>
          <h2 className="text-text text-xl font-semibold">
            {t('emptyTitle')}
          </h2>
          <p className="text-text-tertiary mx-auto mt-2 max-w-sm text-sm">
            {t('emptyDesc')}
          </p>
          <Link
            href="/listings/new"
            className="bg-primary text-primary-foreground mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm"
          >
            <IconaPiu className="h-4 w-4" />
            {t('createListing')}
          </Link>
        </section>
      )}
    </div>
  )
}

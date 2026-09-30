import { Suspense } from 'react'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'
import { IconaAnnunci, IconaPiu, IconaFreccia } from '@/components/icone'
import { ElencoRighe } from '@/components/scheletro'

type Listing = {
  id: string
  title: string
  address: string
  city: string
  monthly_rent: number
  rooms: number
  status: 'active' | 'paused' | 'closed'
  created_at: string
  applications: { count: number }[]
}

// Le colonne della tabella. Ripetute in intestazione e righe: stando in una
// costante sola non possono più disallinearsi tra loro.
const COLONNE = 'md:grid-cols-[1fr_170px_120px_90px_120px_40px]'

async function EmptyState() {
  const t = await getTranslations('listings.list')
  return (
    <div className="bg-surface border-border rounded-xl border px-6 py-14 text-center">
      <div className="bg-primary/10 text-primary mx-auto mb-5 inline-flex rounded-2xl p-4">
        <IconaAnnunci className="h-7 w-7" />
      </div>
      <h2 className="text-text text-lg font-semibold">{t('emptyTitle')}</h2>
      <p className="text-text-tertiary mx-auto mt-2 max-w-sm text-sm">{t('emptyDesc')}</p>
      <Link
        href="/listings/new"
        className="bg-primary text-primary-foreground mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm"
      >
        <IconaPiu className="h-4 w-4" />
        {t('emptyCta')}
      </Link>
    </div>
  )
}

async function ListingsTable() {
  const supabase = await createClient()
  const t = await getTranslations('listings.list')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  const STATI: Record<Listing['status'], { etichetta: string; classi: string }> = {
    active: { etichetta: tc('status.active'), classi: 'text-success bg-success/12' },
    paused: { etichetta: tc('status.paused'), classi: 'text-warning bg-warning/12' },
    closed: { etichetta: tc('status.closed'), classi: 'text-text-tertiary bg-border/60' },
  }

  function StatusBadge({ status }: { status: Listing['status'] }) {
    const s = STATI[status] ?? STATI.closed
    return (
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.classi}`}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
        {s.etichetta}
      </span>
    )
  }

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, address, city, monthly_rent, rooms, status, created_at, applications(count)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="border-danger/35 bg-danger/10 text-danger rounded-xl border px-5 py-4 text-sm">
        {t('error')}
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="bg-surface border-border overflow-hidden rounded-xl border">
      {/* Intestazione: solo su schermo largo. Su telefono le righe diventano
          schede impilate, dove i valori si spiegano da soli. */}
      <div className={`border-border text-text-tertiary hidden gap-4 border-b px-5 py-3 text-[11px] font-semibold tracking-wider uppercase md:grid ${COLONNE}`}>
        <span>{t('colListing')}</span>
        <span>{t('colAddress')}</span>
        <span>{t('colRent')}</span>
        <span>{t('colApplications')}</span>
        <span>{t('colStatus')}</span>
        <span />
      </div>

      <div className="divide-border divide-y">
        {(listings as Listing[]).map(listing => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className={`hover:bg-primary-subtle/50 group grid grid-cols-1 gap-2 px-5 py-4 transition-colors md:items-center md:gap-4 ${COLONNE}`}
          >
            <div className="min-w-0">
              <p className="text-text truncate text-sm font-medium">{listing.title}</p>
              {listing.rooms > 0 && (
                <p className="text-text-tertiary mt-0.5 text-xs">{t('rooms', { count: listing.rooms })}</p>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-text-secondary truncate text-[13px]">{listing.address}</p>
              <p className="text-text-tertiary mt-0.5 truncate text-xs">{listing.city}</p>
            </div>

            {/* md:contents fa sparire questo contenitore su schermo largo: i
                quattro elementi entrano da soli nelle colonne della griglia.
                Su telefono invece restano insieme su una riga sola. */}
            <div className="flex flex-wrap items-center gap-3 md:contents">
              <p className="text-text shrink-0 text-sm font-semibold whitespace-nowrap">
                {formatCurrency(listing.monthly_rent, locale)}
                <span className="text-text-tertiary text-xs font-normal">{tc('perMonth')}</span>
              </p>

              <span className="bg-primary/10 text-primary inline-flex shrink-0 justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold">
                {listing.applications[0]?.count ?? 0}
              </span>

              <StatusBadge status={listing.status} />

              <IconaFreccia
                aria-label={t('manage')}
                className="text-text-tertiary ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 md:ml-0 md:justify-self-end"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function ListingsPage() {
  const t = await getTranslations('listings.list')

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-text text-2xl font-bold tracking-tight md:text-[28px]">{t('title')}</h1>
          <p className="text-text-tertiary mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <Link
          href="/listings/new"
          className="bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm"
        >
          <IconaPiu className="h-4 w-4" />
          {t('newListing')}
        </Link>
      </header>

      <Suspense fallback={<ElencoRighe righe={4} testata={false} />}>
        <ListingsTable />
      </Suspense>
    </div>
  )
}

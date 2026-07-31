import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'

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
    { count: activeListingsCount },
    { data: agencyListingIds },
    { data: recentListings },
    { count: activeProceduresCount },
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
  const { count: applicationsCount } = listingIds.length > 0
    ? await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('listing_id', listingIds)
    : { count: 0 }

  const stats = [
    { label: t('statActiveListings'), value: String(activeListingsCount ?? 0), color: 'var(--primary)' },
    { label: t('statApplications'),   value: String(applicationsCount  ?? 0), color: 'var(--success)' },
    { label: t('statProcedures'),     value: String(activeProceduresCount ?? 0), color: 'var(--warning)' },
  ]

  const hasActiveListings = (recentListings ?? []).length > 0

  return (
    <div>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        {t('title')}
      </h1>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '32px' }}>
        {t('welcome', { email: user?.email ?? '' })}
      </p>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ color: stat.color, fontSize: '32px', fontWeight: '700' }}>
              {stat.value}
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Ultimi annunci attivi o empty state */}
      {hasActiveListings ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>{t('recentListingsTitle')}</p>
            <a href="/listings" style={{
              color: 'var(--primary)', fontSize: '13px', textDecoration: 'none', fontWeight: 500,
            }}>
              {t('viewAll')}
            </a>
          </div>

          {(recentListings ?? []).map((listing, i) => {
            const appCount = (listing.applications as { count: number }[])[0]?.count ?? 0
            return (
              <a
                key={listing.id}
                href={`/listings/${listing.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 24px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                    {listing.title}
                  </p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    {listing.address}, {listing.city} · {formatCurrency(listing.monthly_rent, locale)}{tc('perMonth')}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    color: 'var(--primary)',
                    borderRadius: '99px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {t('applicationsCount', { count: appCount })}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <h2 style={{ color: 'var(--text)', fontSize: '20px', marginBottom: '8px' }}>
            {t('emptyTitle')}
          </h2>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '24px' }}>
            {t('emptyDesc')}
          </p>
          <a href="/listings/new" style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            {t('createListing')}
          </a>
        </div>
      )}
    </div>
  )
}

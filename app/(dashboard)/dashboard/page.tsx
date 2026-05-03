import { createClient } from '@/lib/supabase/server'

function formatRent(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    { label: 'Annunci attivi',  value: String(activeListingsCount ?? 0), color: '#1060E8' },
    { label: 'Candidature',     value: String(applicationsCount  ?? 0), color: '#1BA35A' },
    { label: 'Procedimenti',    value: '0',                              color: '#E89210' },
  ]

  const hasActiveListings = (recentListings ?? []).length > 0

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6B7585', marginBottom: '32px' }}>
        Benvenuto, {user?.email}
      </p>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: '#1C2230',
            border: '1px solid #2E3540',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ color: stat.color, fontSize: '32px', fontWeight: '700' }}>
              {stat.value}
            </div>
            <div style={{ color: '#6B7585', fontSize: '14px', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Ultimi annunci attivi o empty state */}
      {hasActiveListings ? (
        <div style={{
          background: '#1C2230',
          border: '1px solid #2E3540',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #2E3540',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>Annunci attivi recenti</p>
            <a href="/listings" style={{
              color: '#1060E8', fontSize: '13px', textDecoration: 'none', fontWeight: 500,
            }}>
              Vedi tutti →
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
                  borderTop: i === 0 ? 'none' : '1px solid #2E3540',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                    {listing.title}
                  </p>
                  <p style={{ color: '#6B7585', fontSize: '12px' }}>
                    {listing.address}, {listing.city} · {formatRent(listing.monthly_rent)}/mese
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    background: 'rgba(16,96,232,0.12)',
                    color: '#1060E8',
                    borderRadius: '99px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {appCount} {appCount === 1 ? 'candidatura' : 'candidature'}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        <div style={{
          background: '#1C2230',
          border: '1px solid #2E3540',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>
            Inizia creando il primo annuncio
          </h2>
          <p style={{ color: '#6B7585', marginBottom: '24px' }}>
            Crea un annuncio per iniziare a raccogliere candidature verificate.
          </p>
          <a href="/listings/new" style={{
            background: '#1060E8',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            Crea annuncio
          </a>
        </div>
      )}
    </div>
  )
}

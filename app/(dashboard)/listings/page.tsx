import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'

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

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          height: '64px',
          background: 'var(--surface)',
          borderRadius: i === 0 ? '12px 12px 0 0' : i === 3 ? '0 0 12px 12px' : '0',
          opacity: 1 - i * 0.18,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

async function EmptyState() {
  const t = await getTranslations('listings.list')
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '64px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '28px',
      }}>
        🏠
      </div>
      <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        {t('emptyTitle')}
      </h2>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginBottom: '28px', maxWidth: '360px', margin: '0 auto 28px' }}>
        {t('emptyDesc')}
      </p>
      <a href="/listings/new" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        padding: '10px 20px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
      }}>
        <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
        {t('emptyCta')}
      </a>
    </div>
  )
}

async function ListingsTable() {
  const supabase = await createClient()
  const t = await getTranslations('listings.list')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  const STATUS_CONFIG: Record<Listing['status'], { label: string; color: string; bg: string }> = {
    active: { label: tc('status.active'), color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' },
    paused: { label: tc('status.paused'), color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' },
    closed: { label: tc('status.closed'), color: 'var(--text-tertiary)', bg: 'color-mix(in srgb, var(--text-tertiary) 15%, transparent)' },
  }

  function StatusBadge({ status }: { status: Listing['status'] }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.closed
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '99px',
        fontSize: '12px',
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }} />
        {cfg.label}
      </span>
    )
  }

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, address, city, monthly_rent, rooms, status, created_at, applications(count)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{
        background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
        borderRadius: '12px',
        padding: '20px 24px',
        color: 'var(--danger)',
        fontSize: '14px',
      }}>
        {t('error')}
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return <EmptyState />
  }

  return (
    // Le colonne hanno larghezze fisse per circa 900px complessivi. Con
    // overflow:hidden, su finestra stretta l'ultima colonna veniva tagliata a
    // metà — il bottone "Gestisci" spariva e non c'era modo di arrivarci.
    // Ora la tabella scorre in orizzontale invece di perdere pezzi.
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflowX: 'auto',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 180px 120px 100px 110px 100px',
        minWidth: '880px',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        gap: '16px',
      }}>
        {[t('colListing'), t('colAddress'), t('colRent'), t('colApplications'), t('colStatus'), ''].map((h, i) => (
          <span key={i} style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {(listings as Listing[]).map((listing, i) => (
        <div
          key={listing.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px 120px 100px 110px 100px',
            minWidth: '880px',
            padding: '16px 24px',
            gap: '16px',
            alignItems: 'center',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}
        >
          {/* Title */}
          <div>
            <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {listing.title}
            </p>
            {listing.rooms > 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                {t('rooms', { count: listing.rooms })}
              </p>
            )}
          </div>

          {/* Address */}
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {listing.address}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {listing.city}
            </p>
          </div>

          {/* Rent */}
          <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {formatCurrency(listing.monthly_rent, locale)}
            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 400 }}>{tc('perMonth')}</span>
          </p>

          {/* Candidature count */}
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)',
              borderRadius: '99px', padding: '3px 10px',
              fontSize: '12px', fontWeight: 600, minWidth: '28px',
            }}>
              {(listing as Listing).applications[0]?.count ?? 0}
            </span>
          </div>

          {/* Status */}
          <StatusBadge status={listing.status} />

          {/* Action */}
          <div style={{ textAlign: 'right' }}>
            <a
              href={`/listings/${listing.id}`}
              style={{
                color: 'var(--primary)',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                display: 'inline-block',
                transition: 'background 0.15s',
              }}
            >
              {t('manage')}
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function ListingsPage() {
  const t = await getTranslations('listings.list')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            {t('title')}
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
            {t('subtitle')}
          </p>
        </div>
        <a
          href="/listings/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
          {t('newListing')}
        </a>
      </div>

      {/* Listings — streamed from Supabase */}
      <Suspense fallback={<TableSkeleton />}>
        <ListingsTable />
      </Suspense>
    </div>
  )
}

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

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

const STATUS_CONFIG: Record<Listing['status'], { label: string; color: string; bg: string }> = {
  active: { label: 'Attivo',   color: '#1BA35A', bg: 'rgba(27,163,90,0.12)'  },
  paused: { label: 'In pausa', color: '#E89210', bg: 'rgba(232,146,16,0.12)' },
  closed: { label: 'Chiuso',   color: '#6B7585', bg: 'rgba(107,117,133,0.15)' },
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

function formatRent(amount: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          height: '64px',
          background: '#1C2230',
          borderRadius: i === 0 ? '12px 12px 0 0' : i === 3 ? '0 0 12px 12px' : '0',
          opacity: 1 - i * 0.18,
          animation: 'pulse 1.5s ease-in-out infinite',
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
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        background: 'rgba(16,96,232,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '28px',
      }}>
        🏠
      </div>
      <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Nessun annuncio ancora
      </h2>
      <p style={{ color: '#6B7585', fontSize: '14px', marginBottom: '28px', maxWidth: '360px', margin: '0 auto 28px' }}>
        Crea il tuo primo annuncio per iniziare a raccogliere candidature verificate.
      </p>
      <a href="/listings/new" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: '#1060E8',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
      }}>
        <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
        Crea il primo annuncio
      </a>
    </div>
  )
}

async function ListingsTable() {
  const supabase = await createClient()
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, address, city, monthly_rent, rooms, status, created_at, applications(count)')
    .order('created_at', { ascending: false })

  console.log('Supabase listings error:', JSON.stringify(error))

  if (error) {
    return (
      <div style={{
        background: 'rgba(220,38,38,0.08)',
        border: '1px solid rgba(220,38,38,0.25)',
        borderRadius: '12px',
        padding: '20px 24px',
        color: '#f87171',
        fontSize: '14px',
      }}>
        Errore nel caricamento degli annunci. Riprova tra qualche istante.
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return <EmptyState />
  }

  return (
    <div style={{
      background: '#1C2230',
      border: '1px solid #2E3540',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 180px 120px 100px 110px 100px',
        padding: '12px 24px',
        borderBottom: '1px solid #2E3540',
        gap: '16px',
      }}>
        {['Annuncio', 'Indirizzo', 'Affitto mensile', 'Candidature', 'Stato', ''].map((h) => (
          <span key={h} style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
            padding: '16px 24px',
            gap: '16px',
            alignItems: 'center',
            borderTop: i === 0 ? 'none' : '1px solid #2E3540',
          }}
        >
          {/* Title */}
          <div>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {listing.title}
            </p>
            {listing.rooms > 0 && (
              <p style={{ color: '#6B7585', fontSize: '12px' }}>
                {listing.rooms} {listing.rooms === 1 ? 'stanza' : 'stanze'}
              </p>
            )}
          </div>

          {/* Address */}
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#9AA3B2', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {listing.address}
            </p>
            <p style={{ color: '#6B7585', fontSize: '12px' }}>
              {listing.city}
            </p>
          </div>

          {/* Rent */}
          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {formatRent(listing.monthly_rent)}
            <span style={{ color: '#6B7585', fontSize: '12px', fontWeight: 400 }}>/mese</span>
          </p>

          {/* Candidature count */}
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(16,96,232,0.12)', color: '#1060E8',
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
                color: '#1060E8',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(16,96,232,0.3)',
                display: 'inline-block',
                transition: 'background 0.15s',
              }}
            >
              Gestisci
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ListingsPage() {
  return (
    <div>
      {/* Header — static shell, renders instantly */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Annunci
          </h1>
          <p style={{ color: '#6B7585', fontSize: '14px' }}>
            Gestisci i tuoi immobili in affitto
          </p>
        </div>
        <a
          href="/listings/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1060E8',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
          Nuovo annuncio
        </a>
      </div>

      {/* Listings — streamed from Supabase */}
      <Suspense fallback={<TableSkeleton />}>
        <ListingsTable />
      </Suspense>
    </div>
  )
}

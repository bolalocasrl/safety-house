'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type OwnerRequirements = {
  no_pets?: boolean
  no_smokers?: boolean
  max_occupants?: number
  min_income_ratio?: number
}

type Listing = {
  id: string
  title: string
  address: string
  city: string
  monthly_rent: number
  rooms: number
  status: 'active' | 'paused' | 'closed'
  public_link_token: string
  owner_requirements: OwnerRequirements | null
  created_at: string
}

type Application = {
  id: string
  created_at: string
  candidates: {
    full_name: string
    email: string
    phone: string
    employment_type: string
    monthly_income: number
  } | null
}

const STATUS_CONFIG: Record<Listing['status'], { label: string; color: string; bg: string }> = {
  active: { label: 'Attivo',   color: '#1BA35A', bg: 'rgba(27,163,90,0.12)'  },
  paused: { label: 'In pausa', color: '#E89210', bg: 'rgba(232,146,16,0.12)' },
  closed: { label: 'Chiuso',   color: '#6B7585', bg: 'rgba(107,117,133,0.15)' },
}

const STATUS_OPTIONS: { value: Listing['status']; label: string }[] = [
  { value: 'active', label: 'Attivo'   },
  { value: 'paused', label: 'In pausa' },
  { value: 'closed', label: 'Chiuso'   },
]

function formatRent(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: Listing['status'] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.closed
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
      color: cfg.color, background: cfg.bg,
    }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [listing, setListing] = useState<Listing | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('id, title, address, city, monthly_rent, rooms, status, public_link_token, owner_requirements, created_at')
        .eq('id', id)
        .single()

      if (listingError || !listingData) {
        setNotFound(true)
        setLoadingPage(false)
        return
      }

      setListing(listingData as Listing)

      const { data: appsData } = await supabase
        .from('applications')
        .select('id, created_at, candidates(full_name, email, phone, employment_type, monthly_income)')
        .eq('listing_id', id)
        .order('created_at', { ascending: false })

      setApplications((appsData ?? []) as unknown as Application[])
      setLoadingPage(false)
    }

    load()
  }, [id])

  async function handleStatusChange(newStatus: Listing['status']) {
    if (!listing || newStatus === listing.status) return
    setStatusUpdating(true)
    setStatusError(null)

    const { data, error } = await supabase
      .from('listings')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setStatusError('Errore durante l\'aggiornamento dello stato.')
    } else {
      setListing(data as Listing)
    }
    setStatusUpdating(false)
  }

  if (loadingPage) {
    return (
      <div style={{ color: '#6B7585', fontSize: '14px', paddingTop: '48px', textAlign: 'center' }}>
        Caricamento...
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Annuncio non trovato</p>
        <a href="/listings" style={{ color: '#1060E8', fontSize: '14px' }}>← Torna agli annunci</a>
      </div>
    )
  }

  const publicLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${listing.public_link_token}`
  const req = listing.owner_requirements ?? {}

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <a href="/listings" style={{ color: '#6B7585', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>
            ← Annunci
          </a>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>
            {listing.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <StatusBadge status={listing.status} />
            <span style={{ color: '#6B7585', fontSize: '13px' }}>
              {listing.address}, {listing.city}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <a
            href={`/listings/${id}/edit`}
            style={{
              padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              color: '#9AA3B2', border: '1px solid #2E3540', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            Modifica
          </a>

          <div style={{ position: 'relative' }}>
            <select
              value={listing.status}
              disabled={statusUpdating}
              onChange={e => handleStatusChange(e.target.value as Listing['status'])}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#fff',
                background: '#1060E8',
                border: 'none',
                cursor: statusUpdating ? 'not-allowed' : 'pointer',
                opacity: statusUpdating ? 0.7 : 1,
                appearance: 'none',
                paddingRight: '36px',
              }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: '#1C2230' }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#fff', fontSize: '10px' }}>
              ▼
            </span>
          </div>
        </div>
      </div>

      {statusError && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
          {statusError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Dettagli immobile */}
        <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '24px' }}>
          <p style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Dettagli immobile
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Affitto mensile', value: formatRent(listing.monthly_rent) + '/mese' },
              { label: 'Stanze',          value: String(listing.rooms) },
              { label: 'Indirizzo',       value: listing.address        },
              { label: 'Città',           value: listing.city           },
            ].map(row => (
              <div key={row.label}>
                <p style={{ color: '#6B7585', fontSize: '11px', marginBottom: '4px' }}>{row.label}</p>
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requisiti proprietario */}
        <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '24px' }}>
          <p style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Requisiti proprietario
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Req label="Niente animali"       active={!!req.no_pets} />
            <Req label="Non fumatori"         active={!!req.no_smokers} />
            <Req label="Massimo occupanti"    value={req.max_occupants != null ? String(req.max_occupants) : '—'} />
            <Req label="Rapporto reddito min" value={req.min_income_ratio != null ? `${req.min_income_ratio}×` : '—'} />
          </div>
        </div>
      </div>

      {/* Link pubblico candidatura */}
      <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Link pubblico candidatura
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <code style={{
            flex: 1,
            padding: '10px 14px',
            background: '#0D1117',
            border: '1px solid #2E3540',
            borderRadius: '8px',
            color: '#9AA3B2',
            fontSize: '13px',
            wordBreak: 'break-all',
          }}>
            {publicLink}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(publicLink)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid #2E3540',
              borderRadius: '8px',
              color: '#9AA3B2',
              fontSize: '13px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Copia
          </button>
          <a
            href={`/apply/${listing.public_link_token}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 16px',
              background: 'rgba(16,96,232,0.12)',
              border: '1px solid rgba(16,96,232,0.3)',
              borderRadius: '8px',
              color: '#1060E8',
              fontSize: '13px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Apri ↗
          </a>
        </div>
      </div>

      {/* Candidature */}
      <div style={{ background: '#1C2230', border: '1px solid #2E3540', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2E3540', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>Candidature</p>
          <span style={{
            background: 'rgba(16,96,232,0.12)',
            color: '#1060E8',
            borderRadius: '99px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {applications.length}
          </span>
        </div>

        {applications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: '#6B7585', fontSize: '14px' }}>Nessuna candidatura ancora</p>
            <p style={{ color: '#6B7585', fontSize: '12px', marginTop: '4px' }}>
              Condividi il link pubblico per raccogliere candidature
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 120px', padding: '10px 24px', gap: '16px', borderBottom: '1px solid #2E3540' }}>
              {['Candidato', 'Contatto', 'Reddito mensile', 'Ricevuta'].map(h => (
                <span key={h} style={{ color: '#6B7585', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {applications.map((app, i) => (
              <div
                key={app.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 140px 120px',
                  padding: '16px 24px',
                  gap: '16px',
                  alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid #2E3540',
                }}
              >
                <div>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                    {app.candidates?.full_name ?? '—'}
                  </p>
                  <p style={{ color: '#6B7585', fontSize: '12px' }}>
                    {app.candidates?.employment_type ?? ''}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#9AA3B2', fontSize: '13px' }}>{app.candidates?.email ?? '—'}</p>
                  <p style={{ color: '#6B7585', fontSize: '12px' }}>{app.candidates?.phone ?? ''}</p>
                </div>
                <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                  {app.candidates?.monthly_income != null
                    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(app.candidates.monthly_income)
                    : '—'}
                </p>
                <p style={{ color: '#6B7585', fontSize: '12px' }}>
                  {new Date(app.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Req({ label, active, value }: { label: string; active?: boolean; value?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#9AA3B2', fontSize: '13px' }}>{label}</span>
      {value !== undefined ? (
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{value}</span>
      ) : (
        <span style={{ color: active ? '#1BA35A' : '#6B7585', fontSize: '13px', fontWeight: 500 }}>
          {active ? 'Sì' : 'No'}
        </span>
      )}
    </div>
  )
}

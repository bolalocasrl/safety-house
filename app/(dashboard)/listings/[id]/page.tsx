'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/format'
import { DocumentStatusBadge, type DocumentStatus } from '@/components/document-status-badge'
import { TestataPagina, ElencoRighe } from '@/components/scheletro'

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
  safety_score: number | null
  candidate_id: string
  candidates: {
    full_name: string
    email: string
    phone: string
    employment_type: string
    monthly_income: number
    document_status: DocumentStatus
  } | null
}

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
      color, background: bg,
    }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
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

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const t = useTranslations('listings.detail')
  const tc = useTranslations('common')
  const locale = useLocale()

  const STATUS_CONFIG: Record<Listing['status'], { label: string; color: string; bg: string }> = {
    active: { label: tc('status.active'), color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' },
    paused: { label: tc('status.paused'), color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' },
    closed: { label: tc('status.closed'), color: 'var(--text-tertiary)', bg: 'color-mix(in srgb, var(--text-tertiary) 15%, transparent)' },
  }

  const STATUS_OPTIONS: { value: Listing['status']; label: string }[] = [
    { value: 'active', label: tc('status.active') },
    { value: 'paused', label: tc('status.paused') },
    { value: 'closed', label: tc('status.closed') },
  ]

  const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
    verified:   tc('documentStatus.verified'),
    suspicious: tc('documentStatus.suspicious'),
    fraudulent: tc('documentStatus.fraudulent'),
  }

  const [listing, setListing] = useState<Listing | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [scoringLoading, setScoringLoading] = useState<Record<string, boolean>>({})
  const [startingProcedure, setStartingProcedure] = useState<Record<string, boolean>>({})

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
        .select('id, created_at, safety_score, candidate_id, candidates(full_name, email, phone, employment_type, monthly_income, document_status)')
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
      setStatusError(t('statusError'))
    } else {
      setListing(data as Listing)
    }
    setStatusUpdating(false)
  }

  async function handleStartProcedure(candidateId: string) {
    setStartingProcedure(prev => ({ ...prev, [candidateId]: true }))
    try {
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: id, candidate_id: candidateId }),
      })
      if (res.ok) {
        const { id: procedureId } = await res.json()
        router.push(`/procedures/${procedureId}`)
      }
    } finally {
      setStartingProcedure(prev => ({ ...prev, [candidateId]: false }))
    }
  }

  async function handleCalculateScore(appId: string) {
    setScoringLoading(prev => ({ ...prev, [appId]: true }))
    try {
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId }),
      })
      if (res.ok) {
        const { safety_score } = await res.json()
        setApplications(prev =>
          prev.map(a => a.id === appId ? { ...a, safety_score } : a)
        )
      }
    } finally {
      setScoringLoading(prev => ({ ...prev, [appId]: false }))
    }
  }

  if (loadingPage) {
    return (
      <div>
        <TestataPagina />
        <ElencoRighe righe={4} />
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: 'var(--text)', fontSize: '18px', marginBottom: '8px' }}>{t('notFound')}</p>
        <a href="/listings" style={{ color: 'var(--primary)', fontSize: '14px' }}>{t('backToListings')}</a>
      </div>
    )
  }

  const publicLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${listing.public_link_token}`
  const req = listing.owner_requirements ?? {}

  // Classifica candidati verificati: punteggio più alto in cima, i non ancora
  // valutati in coda (non sono "peggiori", semplicemente non hanno ancora uno score).
  const sortedApplications = [...applications].sort((a, b) => {
    if (a.safety_score == null && b.safety_score == null) return 0
    if (a.safety_score == null) return 1
    if (b.safety_score == null) return -1
    return b.safety_score - a.safety_score
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <a href="/listings" style={{ color: 'var(--text-tertiary)', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>
            {t('backToListings')}
          </a>
          <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>
            {listing.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <StatusBadge {...(STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.closed)} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {listing.address}, {listing.city}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <a
            href={`/listings/${id}/edit`}
            style={{
              padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              color: 'var(--text-secondary)', border: '1px solid var(--border)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            {t('edit')}
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
                color: 'var(--primary-foreground)',
                background: 'var(--primary)',
                border: 'none',
                cursor: statusUpdating ? 'not-allowed' : 'pointer',
                opacity: statusUpdating ? 0.7 : 1,
                appearance: 'none',
                paddingRight: '36px',
              }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: 'var(--surface)' }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text)', fontSize: '10px' }}>
              ▼
            </span>
          </div>
        </div>
      </div>

      {statusError && (
        <div style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)', borderRadius: '8px', padding: '12px 16px', color: 'var(--danger)', fontSize: '13px', marginBottom: '20px' }}>
          {statusError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Dettagli immobile */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            {t('propertyDetailsTitle')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: t('monthlyRent'), value: formatCurrency(listing.monthly_rent, locale) + tc('perMonth') },
              { label: t('rooms'),       value: String(listing.rooms) },
              { label: t('address'),     value: listing.address },
              { label: t('city'),        value: listing.city },
            ].map(row => (
              <div key={row.label}>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '4px' }}>{row.label}</p>
                <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requisiti proprietario */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            {t('requirementsTitle')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Req label={t('noPets')} active={!!req.no_pets} yes={tc('yes')} no={tc('no')} />
            <Req label={t('noSmokers')} active={!!req.no_smokers} yes={tc('yes')} no={tc('no')} />
            <Req label={t('maxOccupants')} value={req.max_occupants != null ? String(req.max_occupants) : tc('dash')} />
            <Req label={t('minIncomeRatio')} value={req.min_income_ratio != null ? `${req.min_income_ratio}×` : tc('dash')} />
          </div>
        </div>
      </div>

      {/* Link pubblico candidatura */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          {t('publicLinkTitle')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <code style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
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
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('copy')}
          </button>
          <a
            href={`/apply/${listing.public_link_token}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 16px',
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
              borderRadius: '8px',
              color: 'var(--primary)',
              fontSize: '13px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {t('open')}
          </a>
        </div>
      </div>

      {/* Candidature */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>{t('applicationsTitle')}</p>
          <span style={{
            background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
            color: 'var(--primary)',
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
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>{t('applicationsEmptyTitle')}</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>
              {t('applicationsEmptyDesc')}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px 90px 140px 110px 150px', padding: '10px 24px', gap: '16px', borderBottom: '1px solid var(--border)' }}>
              {[t('colCandidate'), t('colContact'), t('colIncome'), t('colScore'), t('colDocument'), t('colReceived'), ''].map((h, i) => (
                <span key={i} style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {sortedApplications.map((app, i) => (
              <div
                key={app.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px 120px 90px 140px 110px 150px',
                  padding: '16px 24px',
                  gap: '16px',
                  alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <div>
                  <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>
                    {app.candidates?.full_name ?? tc('dash')}
                  </p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    {app.candidates?.employment_type ?? ''}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{app.candidates?.email ?? tc('dash')}</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{app.candidates?.phone ?? ''}</p>
                </div>
                <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
                  {app.candidates?.monthly_income != null
                    ? formatCurrency(app.candidates.monthly_income, locale)
                    : tc('dash')}
                </p>
                <div>
                  {app.safety_score != null ? (
                    <ScoreBadge score={app.safety_score} />
                  ) : (
                    <button
                      onClick={() => handleCalculateScore(app.id)}
                      disabled={!!scoringLoading[app.id]}
                      style={{
                        padding: '5px 12px',
                        background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: scoringLoading[app.id] ? 'not-allowed' : 'pointer',
                        opacity: scoringLoading[app.id] ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {scoringLoading[app.id] ? '...' : t('calculateScore')}
                    </button>
                  )}
                </div>
                <div>
                  {app.candidates && (
                    <DocumentStatusBadge
                      status={app.candidates.document_status}
                      label={DOC_STATUS_LABELS[app.candidates.document_status] ?? DOC_STATUS_LABELS.verified}
                    />
                  )}
                </div>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                  {formatDate(app.created_at, locale)}
                </p>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleStartProcedure(app.candidate_id)}
                    disabled={!!startingProcedure[app.candidate_id]}
                    style={{
                      padding: '5px 12px',
                      background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
                      borderRadius: '6px',
                      color: 'var(--warning)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: startingProcedure[app.candidate_id] ? 'not-allowed' : 'pointer',
                      opacity: startingProcedure[app.candidate_id] ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {startingProcedure[app.candidate_id] ? '...' : t('startProcedure')}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Req({ label, active, value, yes, no }: { label: string; active?: boolean; value?: string; yes?: string; no?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
      {value !== undefined ? (
        <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500 }}>{value}</span>
      ) : (
        <span style={{ color: active ? 'var(--success)' : 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
          {active ? yes : no}
        </span>
      )}
    </div>
  )
}

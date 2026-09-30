'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function NewListingPage() {
  const router = useRouter()
  const t = useTranslations('listings')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    address: '',
    city: '',
    monthly_rent: '',
    rooms: '',
    no_pets: false,
    no_smokers: false,
    max_occupants: '2',
    min_income_ratio: '3',
  })

  function set(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        address: form.address,
        city: form.city,
        monthly_rent: Number(form.monthly_rent),
        rooms: Number(form.rooms),
        no_pets: form.no_pets,
        no_smokers: form.no_smokers,
        max_occupants: Number(form.max_occupants),
        min_income_ratio: Number(form.min_income_ratio),
      }),
    })

    if (!res.ok) {
      setError(t('new.error'))
      setLoading(false)
      return
    }

    router.push('/listings')
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="text-text mb-1 text-[26px] font-bold tracking-tight md:text-[32px]">
          {t('new.title')}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
          {t('new.subtitle')}
        </p>
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '640px',
      }}>
        <form onSubmit={handleSubmit}>

          {/* Titolo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>{t('form.titleLabel')}</label>
            <input
              style={inputStyle}
              type="text"
              placeholder={t('form.titlePlaceholder')}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>

          {/* Indirizzo + Città */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>{t('form.addressLabel')}</label>
              <input
                style={inputStyle}
                type="text"
                placeholder={t('form.addressPlaceholder')}
                value={form.address}
                onChange={e => set('address', e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{t('form.cityLabel')}</label>
              <input
                style={inputStyle}
                type="text"
                placeholder={t('form.cityPlaceholder')}
                value={form.city}
                onChange={e => set('city', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Affitto + Stanze */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div>
              <label style={labelStyle}>{t('form.rentLabel')}</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder={t('form.rentPlaceholder')}
                value={form.monthly_rent}
                onChange={e => set('monthly_rent', e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{t('form.roomsLabel')}</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                placeholder={t('form.roomsPlaceholder')}
                value={form.rooms}
                onChange={e => set('rooms', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: '24px' }} />

          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('form.requirementsTitle')}
          </p>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.no_pets}
                onChange={e => set('no_pets', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('form.noPets')}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.no_smokers}
                onChange={e => set('no_smokers', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('form.noSmokers')}</span>
            </label>
          </div>

          {/* Max occupants + Income ratio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div>
              <label style={labelStyle}>{t('form.maxOccupants')}</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={form.max_occupants}
                onChange={e => set('max_occupants', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('form.minIncomeRatio')}</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                step="0.5"
                value={form.min_income_ratio}
                onChange={e => set('min_income_ratio', e.target.value)}
              />
              <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '6px' }}>
                {t('form.minIncomeHint', { ratio: form.min_income_ratio })}
              </p>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t('new.submitting') : t('new.submit')}
            </button>
            <Link
              href="/listings"
              style={{
                padding: '12px 20px',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {tc('cancel')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

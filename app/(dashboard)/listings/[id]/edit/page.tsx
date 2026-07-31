'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

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

type ListingForm = {
  title: string
  address: string
  city: string
  monthly_rent: string
  rooms: string
  no_pets: boolean
  no_smokers: boolean
  max_occupants: string
  min_income_ratio: string
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('listings')
  const tc = useTranslations('common')

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<ListingForm>({
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

  useEffect(() => {
    async function load() {
      const { data, error: loadError } = await supabase
        .from('listings')
        .select('title, address, city, monthly_rent, rooms, owner_requirements')
        .eq('id', id)
        .single()

      if (loadError || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const req = (data.owner_requirements ?? {}) as {
        no_pets?: boolean
        no_smokers?: boolean
        max_occupants?: number
        min_income_ratio?: number
      }

      setForm({
        title: data.title ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        monthly_rent: String(data.monthly_rent ?? ''),
        rooms: String(data.rooms ?? ''),
        no_pets: !!req.no_pets,
        no_smokers: !!req.no_smokers,
        max_occupants: req.max_occupants != null ? String(req.max_occupants) : '2',
        min_income_ratio: req.min_income_ratio != null ? String(req.min_income_ratio) : '3',
      })
      setLoading(false)
    }

    load()
  }, [id])

  function set(field: keyof ListingForm, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('listings')
      .update({
        title: form.title,
        address: form.address,
        city: form.city,
        monthly_rent: Number(form.monthly_rent),
        rooms: Number(form.rooms),
        owner_requirements: {
          no_pets: form.no_pets,
          no_smokers: form.no_smokers,
          max_occupants: Number(form.max_occupants),
          min_income_ratio: Number(form.min_income_ratio),
        },
      })
      .eq('id', id)

    if (updateError) {
      setError(t('edit.error'))
      setSaving(false)
      return
    }

    router.push(`/listings/${id}`)
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', paddingTop: '48px', textAlign: 'center' }}>
        {tc('loading')}
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: 'var(--text)', fontSize: '18px', marginBottom: '8px' }}>{t('edit.notFound')}</p>
        <a href="/listings" style={{ color: 'var(--primary)', fontSize: '14px' }}>{t('edit.backToListings')}</a>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <a href={`/listings/${id}`} style={{ color: 'var(--text-tertiary)', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>
          {t('edit.backToListing')}
        </a>
        <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          {t('edit.title')}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
          {t('edit.subtitle')}
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

          <div style={{ borderTop: '1px solid var(--border)', marginBottom: '24px' }} />

          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('form.requirementsTitle')}
          </p>

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
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t('edit.saving') : t('edit.submit')}
            </button>
            <a
              href={`/listings/${id}`}
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
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

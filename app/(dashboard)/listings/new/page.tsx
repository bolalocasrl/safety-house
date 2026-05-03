'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0D1117',
  border: '1px solid #2E3540',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9AA3B2',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function NewListingPage() {
  const router = useRouter()
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
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Errore durante la creazione dell\'annuncio.')
      setLoading(false)
      return
    }

    router.push('/listings')
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          Nuovo annuncio
        </h1>
        <p style={{ color: '#6B7585', fontSize: '14px' }}>
          Compila i dati dell'immobile da pubblicare
        </p>
      </div>

      <div style={{
        background: '#1C2230',
        border: '1px solid #2E3540',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '640px',
      }}>
        <form onSubmit={handleSubmit}>

          {/* Titolo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Titolo annuncio</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Es. Trilocale luminoso in centro"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>

          {/* Indirizzo + Città */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Indirizzo</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Via Roma 12"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Città</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Milano"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Affitto + Stanze */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div>
              <label style={labelStyle}>Affitto mensile (€)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="1200"
                value={form.monthly_rent}
                onChange={e => set('monthly_rent', e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Numero di stanze</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                placeholder="3"
                value={form.rooms}
                onChange={e => set('rooms', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #2E3540', marginBottom: '24px' }} />

          <p style={{ color: '#9AA3B2', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Requisiti del proprietario
          </p>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.no_pets}
                onChange={e => set('no_pets', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1060E8', cursor: 'pointer' }}
              />
              <span style={{ color: '#9AA3B2', fontSize: '14px' }}>Niente animali</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.no_smokers}
                onChange={e => set('no_smokers', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1060E8', cursor: 'pointer' }}
              />
              <span style={{ color: '#9AA3B2', fontSize: '14px' }}>Non fumatori</span>
            </label>
          </div>

          {/* Max occupants + Income ratio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div>
              <label style={labelStyle}>Massimo occupanti</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={form.max_occupants}
                onChange={e => set('max_occupants', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Rapporto reddito minimo (x)</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                step="0.5"
                value={form.min_income_ratio}
                onChange={e => set('min_income_ratio', e.target.value)}
              />
              <p style={{ color: '#6B7585', fontSize: '11px', marginTop: '6px' }}>
                Reddito mensile ≥ {form.min_income_ratio}× l'affitto
              </p>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#f87171',
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
                background: '#1060E8',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creazione...' : 'Crea annuncio'}
            </button>
            <a
              href="/listings"
              style={{
                padding: '12px 20px',
                background: 'transparent',
                color: '#6B7585',
                border: '1px solid #2E3540',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Annulla
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

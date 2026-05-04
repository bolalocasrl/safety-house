'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const inputReadonlyStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid #2E3540',
  borderRadius: '8px',
  color: '#9AA3B2',
  fontSize: '14px',
  boxSizing: 'border-box',
  cursor: 'default',
  userSelect: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#6B7585',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const sectionTitleStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  marginBottom: '20px',
  paddingBottom: '12px',
  borderBottom: '1px solid #2E3540',
}

const cardStyle: React.CSSProperties = {
  background: '#1C2230',
  border: '1px solid #2E3540',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? '#1060E8' : '#2E3540',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
      aria-checked={checked}
      role="switch"
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        transition: 'left 0.18s',
      }} />
    </button>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid #2E3540' }}>
      <div>
        <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: description ? '2px' : 0 }}>{label}</p>
        {description && <p style={{ color: '#6B7585', fontSize: '12px' }}>{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

const LANG_OPTIONS: { value: 'it' | 'es' | 'en'; label: string; flag: string }[] = [
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'es', label: 'Español',  flag: '🇪🇸' },
  { value: 'en', label: 'English',  flag: '🇬🇧' },
]

export default function SettingsPage() {
  const [agencyName, setAgencyName]               = useState<string | null>(null)
  const [email, setEmail]                         = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile]       = useState(true)

  const [theme, setTheme]                         = useState<'dark' | 'light'>('dark')
  const [lang, setLang]                           = useState<'it' | 'es' | 'en'>('it')
  const [notifApplications, setNotifApplications] = useState(true)
  const [notifProcedures, setNotifProcedures]     = useState(true)

  useEffect(() => {
    // Ripristina preferenze salvate
    const savedTheme = localStorage.getItem('sh_theme') as 'dark' | 'light' | null
    const savedLang  = localStorage.getItem('sh_lang')  as 'it' | 'es' | 'en' | null
    const savedNA    = localStorage.getItem('sh_notif_applications')
    const savedNP    = localStorage.getItem('sh_notif_procedures')

    if (savedTheme) {
      setTheme(savedTheme)
      if (savedTheme === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    if (savedLang) setLang(savedLang)
    if (savedNA !== null) setNotifApplications(savedNA === 'true')
    if (savedNP !== null) setNotifProcedures(savedNP === 'true')

    // Carica dati utente + agenzia
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoadingProfile(false); return }
      setEmail(user.email ?? null)
      supabase
        .from('users')
        .select('agencies(name)')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const row = data as { agencies: { name: string } | null } | null
          setAgencyName(row?.agencies?.name ?? null)
          setLoadingProfile(false)
        })
    })
  }, [])

  function handleThemeChange(dark: boolean) {
    const next = dark ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('sh_theme', next)
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  function handleLangChange(value: 'it' | 'es' | 'en') {
    setLang(value)
    localStorage.setItem('sh_lang', value)
  }

  function handleNotifApplications(v: boolean) {
    setNotifApplications(v)
    localStorage.setItem('sh_notif_applications', String(v))
  }

  function handleNotifProcedures(v: boolean) {
    setNotifProcedures(v)
    localStorage.setItem('sh_notif_procedures', String(v))
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          Impostazioni
        </h1>
        <p style={{ color: '#6B7585', fontSize: '14px' }}>
          Gestisci il profilo, le preferenze e il piano
        </p>
      </div>

      {/* 1 — Profilo Agenzia */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Profilo Agenzia</p>
        {loadingProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[120, 200].map(w => (
              <div key={w} style={{ height: '38px', background: '#2E3540', borderRadius: '8px', width: `${w}px`, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Nome agenzia</label>
              <div style={inputReadonlyStyle}>{agencyName ?? '—'}</div>
            </div>
            <div>
              <label style={labelStyle}>Email account</label>
              <div style={inputReadonlyStyle}>{email ?? '—'}</div>
            </div>
            <p style={{ color: '#6B7585', fontSize: '12px' }}>
              Per modificare i dati contatta il supporto.
            </p>
          </div>
        )}
      </div>

      {/* 2 — Preferenze */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Preferenze</p>

        <ToggleRow
          label="Tema scuro"
          description="Usa l'interfaccia con sfondo scuro"
          checked={theme === 'dark'}
          onChange={handleThemeChange}
        />

        <div style={{ paddingTop: '16px' }}>
          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Lingua interfaccia</p>
          <p style={{ color: '#6B7585', fontSize: '12px', marginBottom: '12px' }}>
            Cambia la lingua dell'applicazione (funzionalità in arrivo)
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleLangChange(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500,
                  background: lang === opt.value ? 'rgba(16,96,232,0.15)' : 'transparent',
                  border: `1px solid ${lang === opt.value ? 'rgba(16,96,232,0.5)' : '#2E3540'}`,
                  color: lang === opt.value ? '#1060E8' : '#9AA3B2',
                  transition: 'all 0.15s',
                }}
              >
                <span>{opt.flag}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 — Piano abbonamento */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Piano abbonamento</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '5px 14px', borderRadius: '99px',
                background: 'rgba(16,96,232,0.12)', color: '#1060E8',
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em',
              }}>
                PRO
              </span>
              <span style={{ color: '#1BA35A', fontSize: '13px', fontWeight: 500 }}>Attivo</span>
            </div>
            <p style={{ color: '#6B7585', fontSize: '13px' }}>€149/mese · Rinnovo automatico</p>
          </div>
          <button
            disabled
            title="Disponibile a breve"
            style={{
              padding: '9px 20px', borderRadius: '8px',
              background: 'transparent',
              border: '1px solid #2E3540',
              color: '#6B7585', fontSize: '13px', fontWeight: 500,
              cursor: 'not-allowed', opacity: 0.5,
            }}
          >
            Upgrade Piano
          </button>
        </div>
      </div>

      {/* 4 — Notifiche */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Notifiche</p>
        <ToggleRow
          label="Nuove candidature via email"
          description="Ricevi un'email quando un candidato si iscrive a un tuo annuncio"
          checked={notifApplications}
          onChange={handleNotifApplications}
        />
        <div style={{ borderBottom: 'none' }}>
          <ToggleRow
            label="Aggiornamenti procedimenti"
            description="Notifiche sulle modifiche di stato nei procedimenti attivi"
            checked={notifProcedures}
            onChange={handleNotifProcedures}
          />
        </div>
        <p style={{ color: '#6B7585', fontSize: '12px', marginTop: '12px' }}>
          Le notifiche email sono al momento visive. L'invio reale via Resend sarà attivo in una prossima versione.
        </p>
      </div>

      {/* 5 — Account */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Account</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Esci dall'account</p>
            <p style={{ color: '#6B7585', fontSize: '12px' }}>Verrai reindirizzato alla pagina di login</p>
          </div>
          <a
            href="/api/auth/logout"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px', borderRadius: '8px',
              background: 'rgba(232,59,45,0.1)',
              border: '1px solid rgba(232,59,45,0.3)',
              color: '#E83B2D', fontSize: '13px', fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            Esci
          </a>
        </div>
      </div>
    </div>
  )
}

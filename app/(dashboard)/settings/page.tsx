'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/theme-provider'

type AppLocale = 'es' | 'ca' | 'it' | 'en'

function setLocaleCookie(next: AppLocale) {
  document.cookie = `sh_lang=${next}; path=/; max-age=31536000`
}

const inputReadonlyStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'color-mix(in srgb, var(--text) 3%, transparent)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  boxSizing: 'border-box',
  cursor: 'default',
  userSelect: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const sectionTitleStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: '15px',
  fontWeight: 600,
  marginBottom: '20px',
  paddingBottom: '12px',
  borderBottom: '1px solid var(--border)',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
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
        background: checked ? 'var(--primary)' : 'var(--border)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
      aria-checked={checked}
      role="switch"
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary-foreground)',
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: description ? '2px' : 0 }}>{label}</p>
        {description && <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

const LANG_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Català' },
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings')
  const locale = useLocale() as AppLocale
  const router = useRouter()

  const [agencyName, setAgencyName]               = useState<string | null>(null)
  const [email, setEmail]                         = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile]       = useState(true)
  const [pendingLocale, setPendingLocale]         = useState<AppLocale | null>(null)
  const [isPending, startTransition]              = useTransition()

  const [notifApplications, setNotifApplications] = useState(true)
  const [notifProcedures, setNotifProcedures]     = useState(true)

  useEffect(() => {
    const savedNA = localStorage.getItem('sh_notif_applications')
    const savedNP = localStorage.getItem('sh_notif_procedures')

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
    setTheme(dark ? 'dark' : 'light')
  }

  function handleLangChange(value: AppLocale) {
    if (value === locale) return
    setPendingLocale(value)
    setLocaleCookie(value)
    startTransition(() => {
      router.refresh()
    })
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
        <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          {t('title')}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
          {t('subtitle')}
        </p>
      </div>

      {/* 1 — Profilo Agenzia */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('agencyProfileTitle')}</p>
        {loadingProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[120, 200].map(w => (
              <div key={w} style={{ height: '38px', background: 'var(--border)', borderRadius: '8px', width: `${w}px`, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>{t('agencyName')}</label>
              <div style={inputReadonlyStyle}>{agencyName ?? '—'}</div>
            </div>
            <div>
              <label style={labelStyle}>{t('accountEmail')}</label>
              <div style={inputReadonlyStyle}>{email ?? '—'}</div>
            </div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {t('contactSupport')}
            </p>
          </div>
        )}
      </div>

      {/* 2 — Preferenze */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('preferencesTitle')}</p>

        <ToggleRow
          label={t('darkTheme')}
          description={t('darkThemeDesc')}
          checked={theme === 'dark'}
          onChange={handleThemeChange}
        />

        <div style={{ paddingTop: '16px' }}>
          <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>{t('languageTitle')}</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginBottom: '12px' }}>
            {t('languageDesc')}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleLangChange(opt.value)}
                disabled={isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 500,
                  background: locale === opt.value ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent',
                  border: `1px solid ${locale === opt.value ? 'color-mix(in srgb, var(--primary) 50%, transparent)' : 'var(--border)'}`,
                  color: locale === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                  opacity: isPending && pendingLocale !== opt.value ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {isPending && pendingLocale === opt.value ? '...' : opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 — Piano abbonamento */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('planTitle')}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '5px 14px', borderRadius: '99px',
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)',
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em',
              }}>
                PRO
              </span>
              <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 500 }}>{t('planActive')}</span>
            </div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('planPrice')}</p>
          </div>
          <button
            disabled
            title={t('upgradeSoon')}
            style={{
              padding: '9px 20px', borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500,
              cursor: 'not-allowed', opacity: 0.5,
            }}
          >
            {t('upgradePlan')}
          </button>
        </div>
      </div>

      {/* 4 — Notifiche */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('notificationsTitle')}</p>
        <ToggleRow
          label={t('notifApplications')}
          description={t('notifApplicationsDesc')}
          checked={notifApplications}
          onChange={handleNotifApplications}
        />
        <div style={{ borderBottom: 'none' }}>
          <ToggleRow
            label={t('notifProcedures')}
            description={t('notifProceduresDesc')}
            checked={notifProcedures}
            onChange={handleNotifProcedures}
          />
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '12px' }}>
          {t('notifFootnote')}
        </p>
      </div>

      {/* 5 — Account */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('accountTitle')}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>{t('logoutTitle')}</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{t('logoutDesc')}</p>
          </div>
          <a
            href="/api/auth/logout"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px', borderRadius: '8px',
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              color: 'var(--danger)', fontSize: '13px', fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            {t('logout')}
          </a>
        </div>
      </div>
    </div>
  )
}

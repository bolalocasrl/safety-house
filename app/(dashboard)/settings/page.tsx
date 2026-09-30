'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/theme-provider'
import { IconaEsci } from '@/components/icone'

type AppLocale = 'es' | 'ca' | 'it' | 'en'

function setLocaleCookie(next: AppLocale) {
  document.cookie = `sh_lang=${next}; path=/; max-age=31536000`
}

const LANG_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Català' },
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
]

function Scheda({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border-border sh-scheda mb-4 rounded-xl border p-6">
      <h2 className="text-text border-border mb-5 border-b pb-3 text-[15px] font-semibold">
        {titolo}
      </h2>
      {children}
    </section>
  )
}

function CampoSolaLettura({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div>
      <span className="text-text-tertiary mb-1.5 block text-[11px] font-semibold tracking-wider uppercase">
        {etichetta}
      </span>
      <div className="bg-text/3 border-border text-text-secondary cursor-default rounded-lg border px-3.5 py-2.5 text-sm select-none">
        {valore}
      </div>
    </div>
  )
}

function Interruttore({ acceso, onChange }: { acceso: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acceso}
      onClick={() => onChange(!acceso)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${acceso ? 'bg-primary' : 'bg-border'}`}
    >
      <span
        className={`bg-primary-foreground absolute top-[3px] h-[18px] w-[18px] rounded-full shadow-sm transition-[left] duration-200 ${
          acceso ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </button>
  )
}

function RigaInterruttore({ etichetta, descrizione, acceso, onChange, ultima }: {
  etichetta: string
  descrizione?: string
  acceso: boolean
  onChange: (v: boolean) => void
  ultima?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${ultima ? '' : 'border-border border-b'}`}>
      <div className="min-w-0">
        <p className="text-text text-sm font-medium">{etichetta}</p>
        {descrizione && <p className="text-text-tertiary mt-0.5 text-xs">{descrizione}</p>}
      </div>
      <Interruttore acceso={acceso} onChange={onChange} />
    </div>
  )
}

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
    <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">
      <header className="mb-8 shrink-0">
        <h1 className="text-text text-[26px] font-bold tracking-tight md:text-[34px]">{t('title')}</h1>
        <p className="text-text-tertiary mt-1 text-sm">{t('subtitle')}</p>
      </header>

      {/* Le impostazioni sono più lunghe della finestra: scorrono qui dentro,
          mentre titolo e menu restano fermi. */}
      <div className="max-w-2xl md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
        <Scheda titolo={t('agencyProfileTitle')}>
          {loadingProfile ? (
            <div className="flex flex-col gap-3">
              <div className="sh-scheletro h-[38px] w-32" />
              <div className="sh-scheletro h-[38px] w-52" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <CampoSolaLettura etichetta={t('agencyName')} valore={agencyName ?? '—'} />
              <CampoSolaLettura etichetta={t('accountEmail')} valore={email ?? '—'} />
              <p className="text-text-tertiary text-xs">{t('contactSupport')}</p>
            </div>
          )}
        </Scheda>

        <Scheda titolo={t('preferencesTitle')}>
          <RigaInterruttore
            etichetta={t('darkTheme')}
            descrizione={t('darkThemeDesc')}
            acceso={theme === 'dark'}
            onChange={handleThemeChange}
          />

          <div className="pt-4">
            <p className="text-text text-sm font-medium">{t('languageTitle')}</p>
            <p className="text-text-tertiary mt-0.5 mb-3 text-xs">{t('languageDesc')}</p>
            <div className="flex flex-wrap gap-2">
              {LANG_OPTIONS.map(opt => {
                const scelta = locale === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleLangChange(opt.value)}
                    disabled={isPending}
                    className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      scelta
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border text-text-secondary hover:text-text'
                    } ${isPending && pendingLocale !== opt.value ? 'opacity-50' : ''}`}
                  >
                    {isPending && pendingLocale === opt.value ? '…' : opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Scheda>

        <Scheda titolo={t('planTitle')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1.5 flex items-center gap-3">
                <span className="bg-terracotta/12 text-terracotta inline-flex rounded-full px-3.5 py-1 text-[13px] font-bold tracking-wider">
                  PRO
                </span>
                <span className="text-success text-[13px] font-medium">{t('planActive')}</span>
              </div>
              <p className="text-text-tertiary text-[13px]">{t('planPrice')}</p>
            </div>
            <button
              disabled
              title={t('upgradeSoon')}
              className="border-border text-text-tertiary rounded-lg border px-5 py-2 text-[13px] font-medium opacity-50"
            >
              {t('upgradePlan')}
            </button>
          </div>
        </Scheda>

        <Scheda titolo={t('notificationsTitle')}>
          <RigaInterruttore
            etichetta={t('notifApplications')}
            descrizione={t('notifApplicationsDesc')}
            acceso={notifApplications}
            onChange={handleNotifApplications}
          />
          <RigaInterruttore
            etichetta={t('notifProcedures')}
            descrizione={t('notifProceduresDesc')}
            acceso={notifProcedures}
            onChange={handleNotifProcedures}
            ultima
          />
          <p className="text-text-tertiary mt-3 text-xs">{t('notifFootnote')}</p>
        </Scheda>

        <Scheda titolo={t('accountTitle')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-text text-sm font-medium">{t('logoutTitle')}</p>
              <p className="text-text-tertiary mt-0.5 text-xs">{t('logoutDesc')}</p>
            </div>
            <a
              href="/api/auth/logout"
              className="border-danger/30 bg-danger/10 text-danger inline-flex items-center gap-2 rounded-lg border px-5 py-2 text-[13px] font-medium"
            >
              <IconaEsci className="h-4 w-4" />
              {t('logout')}
            </a>
          </div>
        </Scheda>
      </div>
    </div>
  )
}

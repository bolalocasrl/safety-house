import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MenuLaterale, { type VoceMenu } from '@/components/menu-laterale'
import { IconaEsci } from '@/components/icone'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const t = await getTranslations('nav')

  // Guardia di ruolo. Prima bastava aver fatto l'accesso: un candidato che
  // apriva un vecchio link magico finiva dritto qui dentro, perché /verify
  // manda alla dashboard chiunque non abbia una candidatura in sospeso.
  // Non vedeva dati altrui (le policy del database reggono), ma si trovava
  // davanti a un gestionale vuoto — e ogni pagina interrogava il database
  // con un'agenzia inesistente, generando errori silenziosi.
  const { data: utente } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!utente?.agency_id) {
    const ta = await getTranslations('auth')
    return (
      <div className="bg-bg flex min-h-screen items-center justify-center px-5">
        <div className="bg-surface border-border w-full max-w-md rounded-xl border p-8 text-center">
          <h1 className="text-text text-xl font-semibold">{ta('noAgency.title')}</h1>
          <p className="text-text-tertiary mt-3 text-sm leading-relaxed">{ta('noAgency.desc')}</p>
          <a
            href="/api/auth/logout"
            className="text-text-secondary border-border mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
          >
            <IconaEsci className="h-4 w-4" />
            {t('logout')}
          </a>
        </div>
      </div>
    )
  }

  const voci: VoceMenu[] = [
    { chiave: 'dashboard',  etichetta: t('dashboard'),  href: '/dashboard' },
    { chiave: 'listings',   etichetta: t('listings'),   href: '/listings' },
    { chiave: 'candidates', etichetta: t('candidates'), href: '/candidates' },
    { chiave: 'procedures', etichetta: t('procedures'), href: '/procedures' },
    { chiave: 'settings',   etichetta: t('settings'),   href: '/settings' },
  ]

  return (
    <div className="bg-bg flex min-h-screen flex-col md:flex-row">
      <MenuLaterale voci={voci} marchio={t('brand')} etichettaEsci={t('logout')} />
      <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  )
}

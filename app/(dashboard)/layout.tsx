import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MenuLaterale, { type VoceMenu } from '@/components/menu-laterale'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const t = await getTranslations('nav')

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

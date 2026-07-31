import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const t = await getTranslations('nav')

  const navItems = [
    { label: t('dashboard'), href: '/dashboard' },
    { label: t('listings'), href: '/listings' },
    { label: t('candidates'), href: '/candidates' },
    { label: t('procedures'), href: '/procedures' },
    { label: t('settings'), href: '/settings' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside style={{ width: '240px', background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: 'var(--text)', fontSize: '18px', fontWeight: '700', padding: '8px 12px', marginBottom: '16px' }}>
          {t('brand')}
        </div>
        {navItems.map(item => (
          <a key={item.href} href={item.href} style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', display: 'block' }}>
            {item.label}
          </a>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <a href="/api/auth/logout" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', padding: '10px 12px', fontSize: '14px', display: 'block' }}>
            {t('logout')}
          </a>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}

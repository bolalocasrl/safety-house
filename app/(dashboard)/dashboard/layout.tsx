import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Annunci', href: '/listings' },
  { label: 'Candidati', href: '/candidates' },
  { label: 'Procedimenti', href: '/procedures' },
  { label: 'Impostazioni', href: '/settings' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1117' }}>
      <aside style={{ width: '240px', background: '#1C2230', borderRight: '1px solid #2E3540', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: '700', padding: '8px 12px', marginBottom: '16px' }}>
          Safety House
        </div>
        {navItems.map(item => (
          <a key={item.href} href={item.href} style={{ color: '#9AA3B2', textDecoration: 'none', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', display: 'block' }}>
            {item.label}
          </a>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <a href="/api/auth/logout" style={{ color: '#6B7585', textDecoration: 'none', padding: '10px 12px', fontSize: '14px', display: 'block' }}>
            Esci
          </a>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
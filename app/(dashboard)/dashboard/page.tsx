import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6B7585', marginBottom: '32px' }}>
        Benvenuto, {user?.email}
      </p>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Annunci attivi', value: '0', color: '#1060E8' },
          { label: 'Candidature', value: '0', color: '#1BA35A' },
          { label: 'Procedimenti', value: '0', color: '#E89210' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1C2230',
            border: '1px solid #2E3540',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ color: stat.color, fontSize: '32px', fontWeight: '700' }}>
              {stat.value}
            </div>
            <div style={{ color: '#6B7585', fontSize: '14px', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div style={{
        background: '#1C2230',
        border: '1px solid #2E3540',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
        <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>
          Inizia creando il primo annuncio
        </h2>
        <p style={{ color: '#6B7585', marginBottom: '24px' }}>
          Crea un annuncio per iniziare a raccogliere candidature verificate.
        </p>
        <a href="/listings" style={{
          background: '#1060E8',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px'
        }}>
          Crea annuncio
        </a>
      </div>
    </div>
  )
}

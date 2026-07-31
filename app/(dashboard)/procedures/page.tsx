import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'

type ProcedureRow = {
  id: string
  step_current: number
  status: string
  created_at: string
  candidates: { full_name: string | null; email: string | null } | null
  listings: { title: string; address: string; city: string } | null
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          height: '68px', background: 'var(--surface)',
          borderRadius: i === 0 ? '12px 12px 0 0' : i === 2 ? '0 0 12px 12px' : '0',
          opacity: 1 - i * 0.2,
        }} />
      ))}
    </div>
  )
}

async function EmptyState() {
  const t = await getTranslations('procedures.list')
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '64px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '12px',
        background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', fontSize: '28px',
      }}>
        📋
      </div>
      <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        {t('emptyTitle')}
      </h2>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', maxWidth: '360px', margin: '0 auto 28px' }}>
        {t('emptyDesc')}
      </p>
      <a href="/listings" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: 'var(--primary)', color: 'var(--primary-foreground)',
        padding: '10px 20px', borderRadius: '8px',
        textDecoration: 'none', fontSize: '14px', fontWeight: 500,
      }}>
        {t('emptyCta')}
      </a>
    </div>
  )
}

async function ProceduresTable() {
  const supabase = await createClient()
  const t = await getTranslations('procedures.list')
  const tc = await getTranslations('common')
  const locale = await getLocale()

  const STEP_LABELS: Record<number, string> = {
    1: tc('procedureSteps.1'),
    2: tc('procedureSteps.2'),
    3: tc('procedureSteps.3'),
    4: tc('procedureSteps.4'),
    5: tc('procedureSteps.5'),
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user!.id)
    .single()

  const agencyId = userData?.agency_id ?? null
  if (!agencyId) return <EmptyState />

  const { data: procedures, error } = await supabase
    .from('procedures')
    .select('id, step_current, status, created_at, candidates(full_name, email), listings(title, address, city)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{
        background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
        borderRadius: '12px', padding: '20px 24px', color: 'var(--danger)', fontSize: '14px',
      }}>
        {t('error')}
      </div>
    )
  }

  const rows = (procedures ?? []) as unknown as ProcedureRow[]
  if (rows.length === 0) return <EmptyState />

  const COLS = '1fr 180px 160px 120px 100px 80px'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '12px 24px', gap: '16px', borderBottom: '1px solid var(--border)' }}>
        {[t('colCandidate'), t('colListing'), t('colCurrentStep'), t('colStatus'), t('colStarted'), ''].map((h, i) => (
          <span key={i} style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {h}
          </span>
        ))}
      </div>

      {rows.map((proc, i) => {
        const isCompleted = proc.status === 'completed'
        const stepLabel = STEP_LABELS[proc.step_current] ?? String(proc.step_current)
        const stepPct = Math.round((proc.step_current / 5) * 100)

        return (
          <div
            key={proc.id}
            style={{
              display: 'grid', gridTemplateColumns: COLS,
              padding: '16px 24px', gap: '16px', alignItems: 'center',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <div>
              <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proc.candidates?.full_name ?? tc('dash')}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proc.candidates?.email ?? ''}
              </p>
            </div>

            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proc.listings?.title ?? tc('dash')}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                {proc.listings?.city ?? ''}
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                {isCompleted ? t('completed') : t('stepProgress', { step: proc.step_current, label: stepLabel })}
              </p>
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', width: '100%' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: isCompleted ? 'var(--success)' : 'var(--primary)',
                  width: isCompleted ? '100%' : `${stepPct}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
              color: isCompleted ? 'var(--success)' : 'var(--primary)',
              background: isCompleted ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--primary) 12%, transparent)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
              {isCompleted ? tc('status.completed') : tc('status.inProgress')}
            </span>

            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {formatDate(proc.created_at, locale)}
            </p>

            <div style={{ textAlign: 'right' }}>
              <a
                href={`/procedures/${proc.id}`}
                style={{
                  color: 'var(--primary)', fontSize: '13px', fontWeight: 500,
                  textDecoration: 'none', padding: '6px 12px',
                  borderRadius: '6px', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                  display: 'inline-block', whiteSpace: 'nowrap',
                }}
              >
                {t('open')}
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default async function ProceduresPage() {
  const t = await getTranslations('procedures.list')

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          {t('title')}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
          {t('subtitle')}
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ProceduresTable />
      </Suspense>
    </div>
  )
}

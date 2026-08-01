export type DocumentStatus = 'verified' | 'suspicious' | 'fraudulent'

const TONE: Record<DocumentStatus, { color: string; bg: string }> = {
  verified:   { color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' },
  suspicious: { color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' },
  fraudulent: { color: 'var(--danger)',  bg: 'color-mix(in srgb, var(--danger) 12%, transparent)' },
}

export function DocumentStatusBadge({ status, label }: { status: DocumentStatus; label: string }) {
  const tone = TONE[status] ?? TONE.verified
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
      color: tone.color, background: tone.bg, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

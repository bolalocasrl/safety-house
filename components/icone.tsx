/**
 * Icone dell'interfaccia, disegnate a mano come SVG.
 *
 * Niente libreria esterna: sono otto simboli, e un pacchetto in più
 * peserebbe sul caricamento più di quanto serva. Tutte ereditano il colore
 * dal testo circostante (`currentColor`), così seguono da sole il tema chiaro
 * e scuro senza doppioni.
 */

type PropsIcona = { className?: string }

function Base({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? 'w-[18px] h-[18px]'}
    >
      {children}
    </svg>
  )
}

export function IconaPannello({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Base>
  )
}

export function IconaAnnunci({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 10h.01M15 10h.01" />
    </Base>
  )
}

export function IconaCandidati({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16.5 5.5a3.25 3.25 0 0 1 0 6.3" />
      <path d="M18.5 14.6c1.6.7 2.5 2.1 2.5 3.9" />
    </Base>
  )
}

export function IconaProcedimenti({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M16 5h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
      <path d="m9 13 2 2 4-4" />
    </Base>
  )
}

export function IconaImpostazioni({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </Base>
  )
}

export function IconaEsci({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Base>
  )
}

export function IconaFreccia({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <path d="m9 18 6-6-6-6" />
    </Base>
  )
}

export function IconaPiu({ className }: PropsIcona) {
  return (
    <Base className={className}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

/** Marchio: lo scudo con la casa, lo stesso segno della pagina di accesso. */
export function Marchio({ className }: PropsIcona) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className ?? 'w-7 h-7'}
    >
      <path
        d="M12 2.5l7.5 3v6.2c0 4.6-3.1 8.4-7.5 9.8-4.4-1.4-7.5-5.2-7.5-9.8V5.5l7.5-3z"
        fill="currentColor"
      />
      <path
        d="M8.6 12.4L12 9.5l3.4 2.9v3.7a.6.6 0 0 1-.6.6h-1.9v-2.5h-1.8v2.5H9.2a.6.6 0 0 1-.6-.6v-3.7z"
        fill="var(--surface)"
      />
    </svg>
  )
}

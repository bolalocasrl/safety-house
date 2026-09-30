'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Marchio,
  IconaPannello,
  IconaAnnunci,
  IconaCandidati,
  IconaProcedimenti,
  IconaImpostazioni,
  IconaEsci,
} from './icone'

/**
 * Menu di navigazione.
 *
 * È un componente client per un motivo solo: evidenziare la voce della pagina
 * aperta, che richiede di sapere l'indirizzo corrente. Le etichette arrivano
 * già tradotte dal layout, che è server.
 *
 * I collegamenti usano <Link> e non <a>: con <a> il browser ricarica tutto il
 * documento a ogni clic — fogli di stile, script, sessione — e sono i secondi
 * di attesa a vuoto che si notavano passando da una sezione all'altra. Con
 * <Link> cambia solo il contenuto, e nel frattempo compare lo scheletro di
 * caricamento.
 *
 * Su schermo stretto la colonna diventa una barra orizzontale scorrevole in
 * cima: prima l'app era utilizzabile solo da computer.
 */

const ICONE = {
  dashboard: IconaPannello,
  listings: IconaAnnunci,
  candidates: IconaCandidati,
  procedures: IconaProcedimenti,
  settings: IconaImpostazioni,
} as const

export type VoceMenu = {
  chiave: keyof typeof ICONE
  etichetta: string
  href: string
}

export default function MenuLaterale({
  voci,
  marchio,
  etichettaEsci,
}: {
  voci: VoceMenu[]
  marchio: string
  etichettaEsci: string
}) {
  const percorso = usePathname()

  return (
    <aside className="bg-surface border-border flex shrink-0 flex-col border-b md:h-full md:w-60 md:border-r md:border-b-0">
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 md:pt-6 md:pb-5">
        <Marchio className="text-primary h-7 w-7 shrink-0" />
        <span className="text-text truncate text-[17px] font-bold tracking-tight [font-family:var(--font-sora)]">
          {marchio}
        </span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-4">
        {voci.map(voce => {
          const Icona = ICONE[voce.chiave]
          const attiva = percorso === voce.href || percorso.startsWith(`${voce.href}/`)
          return (
            <Link
              key={voce.href}
              href={voce.href}
              aria-current={attiva ? 'page' : undefined}
              className={[
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm whitespace-nowrap transition-colors',
                attiva
                  ? 'sh-voce-attiva bg-primary-subtle text-primary font-semibold'
                  : 'text-text-secondary hover:bg-primary-subtle/60 hover:text-text font-medium',
              ].join(' ')}
            >
              <Icona className="h-[18px] w-[18px] shrink-0" />
              {voce.etichetta}
            </Link>
          )
        })}

        {/* Il logout resta un <a>: non è una pagina ma una route che cancella
            la sessione e rimanda al login, e va raggiunta con una richiesta
            vera al server, non con la navigazione interna.
            mt-auto lo spinge in fondo quando la colonna è verticale; in barra
            orizzontale resta semplicemente l'ultima voce. */}
        <a
          href="/api/auth/logout"
          className="text-text-tertiary hover:text-danger hover:bg-danger/8 flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors md:mt-auto"
        >
          <IconaEsci className="h-[18px] w-[18px] shrink-0" />
          {etichettaEsci}
        </a>
      </nav>
    </aside>
  )
}

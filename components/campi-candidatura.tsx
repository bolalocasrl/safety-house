'use client'

import { bandiera, nomePaese, paesiOrdinati, PAESI } from '@/lib/paesi'

/**
 * I due campi del modulo di candidatura che prima si compilavano a mano.
 *
 * Nazionalità e telefono erano caselle di testo libere: ognuno scriveva come
 * gli pareva ("Española", "espanola", "SPAGNA"), e i dati arrivavano in
 * agenzia inconfrontabili tra loro. Da tendine, invece, arrivano già puliti —
 * e per chi compila è meno da digitare, soprattutto dal telefono.
 */

const TENDINA: React.CSSProperties = {
  padding: '11px 10px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
}

/**
 * Nazionalità.
 *
 * Salva il codice del paese (ES, MA, RO…) e non il nome: il nome dipende
 * dalla lingua di chi compila, e un'agenzia italiana si sarebbe trovata in
 * elenco "Rumanía" accanto a "Romania" senza poterli confrontare.
 */
export function CampoNazionalita({
  valore, onChange, locale, placeholder,
}: {
  valore: string
  onChange: (v: string) => void
  locale: string
  placeholder: string
}) {
  return (
    <select
      value={valore}
      onChange={e => onChange(e.target.value)}
      style={{ ...TENDINA, width: '100%' }}
    >
      <option value="">{placeholder}</option>
      {paesiOrdinati(locale).map(p => (
        <option key={p.codice} value={p.codice}>
          {bandiera(p.codice)}  {nomePaese(p.codice, locale)}
        </option>
      ))}
    </select>
  )
}

// Il valore salvato è "prefisso spazio numero": lo divido al primo spazio.
// Senza valore parto dalla Spagna, che è dove sta l'agenzia.
function dividi(v: string): [string, string] {
  if (!v) return ['+34', '']
  const i = v.indexOf(' ')
  return i === -1 ? ['+34', v] : [v.slice(0, i), v.slice(i + 1)]
}

/**
 * Telefono: tendina del prefisso con bandiera, più il numero.
 *
 * Il numero accetta solo cifre e usa inputMode="numeric", così sul telefono
 * si apre il tastierino numerico invece della tastiera intera.
 *
 * La tendina ha larghezza fissa: se fosse elastica si allargherebbe fino al
 * nome di paese più lungo dell'elenco, sbilanciando la riga.
 */
export function CampoTelefono({
  valore, onChange, locale, placeholder,
}: {
  valore: string
  onChange: (v: string) => void
  locale: string
  placeholder: string
}) {
  const [prefisso, numero] = dividi(valore)

  function cambiaPrefisso(nuovo: string) {
    onChange(numero ? `${nuovo} ${numero}` : nuovo)
  }

  function cambiaNumero(grezzo: string) {
    const soloCifre = grezzo.replace(/\D/g, '')
    onChange(soloCifre ? `${prefisso} ${soloCifre}` : '')
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <select
        value={prefisso}
        onChange={e => cambiaPrefisso(e.target.value)}
        aria-label="Prefisso"
        style={{ ...TENDINA, width: '132px', flexShrink: 0, textOverflow: 'ellipsis' }}
      >
        {/* Se più paesi condividono il prefisso la chiave resta il codice,
            ma il valore selezionato è il prefisso: due voci con lo stesso
            valore sono indistinguibili una volta scelte, ed è accettabile
            perché quello che conta è il numero da comporre. */}
        {paesiOrdinati(locale).map(p => (
          <option key={p.codice} value={p.prefisso}>
            {bandiera(p.codice)}  {p.prefisso}  {nomePaese(p.codice, locale)}
          </option>
        ))}
      </select>

      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={numero}
        onChange={e => cambiaNumero(e.target.value)}
        style={{
          ...TENDINA,
          width: '100%',
          minWidth: 0,
          padding: '11px 14px',
        }}
      />
    </div>
  )
}

/** Serve alla pagina del candidato per rimettere insieme prefisso e bandiera. */
export function bandieraDalPrefisso(telefono: string | null | undefined): string {
  if (!telefono) return ''
  const [prefisso] = dividi(telefono)
  const p = PAESI.find(x => x.prefisso === prefisso)
  return p ? bandiera(p.codice) : ''
}

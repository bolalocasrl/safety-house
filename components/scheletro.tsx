/**
 * Mattoncini per le schermate di caricamento.
 *
 * Le pagine dell'elenco (Panel, Anuncios, Candidatos, Trámites) sono generate
 * dal server: finché le query non rispondono il browser non ha niente da
 * mostrare, e l'utente resta davanti a una pagina bianca senza capire se il
 * clic è andato a buon fine. Next.js mostra il file `loading.tsx` della
 * cartella in quell'intervallo: questi pezzi servono a disegnarci dentro la
 * forma del contenuto in arrivo.
 *
 * Le misure ricalcano quelle vere delle pagine (schede da 12px di raggio,
 * titolo da 28px) così il passaggio allo contenuto reale non fa "saltare" il
 * layout.
 */

type StileOpzionale = { style?: React.CSSProperties }

/** Blocco grigio singolo: l'unità di base di ogni scheletro. */
export function Blocco({
  larghezza = '100%',
  altezza = 14,
  style,
}: { larghezza?: string | number; altezza?: number } & StileOpzionale) {
  return (
    <div
      className="sh-scheletro"
      style={{ width: larghezza, height: altezza, ...style }}
    />
  )
}

/** Titolo della pagina più riga di sottotitolo. */
export function TestataPagina() {
  return (
    <div style={{ marginBottom: '32px' }}>
      <Blocco larghezza={180} altezza={28} style={{ marginBottom: '12px' }} />
      <Blocco larghezza={280} altezza={16} />
    </div>
  )
}

/** Fila di schede con i contatori in cima alla dashboard. */
export function SchedeContatori({ quante = 3 }: { quante?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${quante}, 1fr)`,
      gap: '16px',
      marginBottom: '32px',
    }}>
      {Array.from({ length: quante }, (_, i) => (
        <div key={i} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <Blocco larghezza={48} altezza={32} style={{ marginBottom: '10px' }} />
          <Blocco larghezza={110} altezza={14} />
        </div>
      ))}
    </div>
  )
}

/** Riquadro con una lista di righe: annunci, candidati, procedimenti. */
export function ElencoRighe({ righe = 4, testata = true }: { righe?: number; testata?: boolean }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {testata && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <Blocco larghezza={200} altezza={15} />
        </div>
      )}
      {Array.from({ length: righe }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '20px 24px',
            borderBottom: i < righe - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <Blocco larghezza={`${55 + ((i * 13) % 25)}%`} altezza={16} style={{ marginBottom: '10px' }} />
            <Blocco larghezza={`${35 + ((i * 17) % 20)}%`} altezza={13} />
          </div>
          <Blocco larghezza={90} altezza={26} style={{ borderRadius: '999px', flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}

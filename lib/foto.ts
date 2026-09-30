/**
 * Foto degli annunci: indirizzi pubblici e riduzione prima del caricamento.
 */

export const CONTENITORE_FOTO = 'annunci'

/** Indirizzo pubblico di una foto a partire dal suo percorso nel contenitore. */
export function urlFoto(percorso: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/${CONTENITORE_FOTO}/${percorso}`
}

/** Elenco delle foto salvato sull'annuncio, difeso da valori inattesi. */
export function elencoFoto(valore: unknown): string[] {
  return Array.isArray(valore) ? valore.filter((x): x is string => typeof x === 'string') : []
}

/** Oltre questo, il file non viene nemmeno aperto: è il tetto del contenitore. */
export const PESO_MASSIMO_CARICABILE = 2 * 1024 * 1024 // 2 MB

/** Sopra questo non ha senso nemmeno provare a decodificarla nel browser. */
export const PESO_MASSIMO_ORIGINALE = 25 * 1024 * 1024 // 25 MB

/** Bersaglio del ridimensionamento: sotto mezzo mega si sta comodi. */
const PESO_OBIETTIVO = 450_000

/** Tentativi in ordine: prima si abbassa la qualità, poi si rimpicciolisce. */
const TENTATIVI: { lato: number; qualita: number }[] = [
  { lato: 1400, qualita: 0.80 },
  { lato: 1400, qualita: 0.65 },
  { lato: 1100, qualita: 0.60 },
  { lato: 900,  qualita: 0.55 },
  { lato: 700,  qualita: 0.50 },
]

function disegna(bitmap: ImageBitmap, lato: number, qualita: number): Promise<Blob | null> {
  const scala = Math.min(1, lato / Math.max(bitmap.width, bitmap.height))
  const tela = document.createElement('canvas')
  tela.width = Math.round(bitmap.width * scala)
  tela.height = Math.round(bitmap.height * scala)
  const ctx = tela.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(bitmap, 0, 0, tela.width, tela.height)
  return new Promise(risolvi => tela.toBlob(risolvi, 'image/jpeg', qualita))
}

/**
 * Riduce l'immagine prima di caricarla.
 *
 * Una foto scattata col telefono pesa facilmente 5 MB, e il piano gratuito di
 * Supabase ne concede 1 GB in tutto. Qui non ci si limita a comprimere una
 * volta: si riprova abbassando qualità e dimensioni finché il file non scende
 * sotto il bersaglio, perché una singola passata su una foto molto grande può
 * ancora lasciare più di un mega.
 *
 * Restituisce null se non si riesce a scendere sotto il tetto del contenitore:
 * meglio dirlo che tentare un caricamento destinato a essere respinto.
 */
export async function riduciImmagine(file: File): Promise<Blob | null> {
  if (file.size > PESO_MASSIMO_ORIGINALE) return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    // Già piccola e nel formato giusto: ricomprimerla la peggiorerebbe e basta.
    if (file.size <= PESO_OBIETTIVO && file.type === 'image/jpeg' &&
        Math.max(bitmap.width, bitmap.height) <= TENTATIVI[0].lato) {
      return file
    }

    let migliore: Blob | null = null
    for (const { lato, qualita } of TENTATIVI) {
      const blob = await disegna(bitmap, lato, qualita)
      if (!blob) continue
      migliore = blob
      if (blob.size <= PESO_OBIETTIVO) return blob
    }

    // Nessun tentativo è sceso sotto il bersaglio: accetto il migliore
    // ottenuto purché stia almeno sotto il tetto del contenitore.
    if (migliore && migliore.size <= PESO_MASSIMO_CARICABILE) return migliore
    return null
  } finally {
    bitmap.close()
  }
}

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

const LATO_MASSIMO = 1600
const QUALITA = 0.82

/**
 * Riduce l'immagine prima di caricarla.
 *
 * Una foto scattata col telefono pesa facilmente 5 MB, e il piano gratuito di
 * Supabase ne concede 1 GB in tutto: senza questo passaggio bastano duecento
 * foto per riempirlo. Ridotta a 1600px di lato lungo resta più che nitida su
 * qualsiasi schermo e pesa qualche centinaio di kilobyte.
 *
 * Se qualcosa va storto restituisce il file originale: meglio una foto pesante
 * che nessuna foto.
 */
export async function riduciImmagine(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scala = Math.min(1, LATO_MASSIMO / Math.max(bitmap.width, bitmap.height))

    // Già abbastanza piccola: la lascio com'è invece di ricomprimerla e
    // peggiorarla senza guadagno.
    if (scala === 1 && file.size < 900_000) {
      bitmap.close()
      return file
    }

    const larghezza = Math.round(bitmap.width * scala)
    const altezza = Math.round(bitmap.height * scala)

    const tela = document.createElement('canvas')
    tela.width = larghezza
    tela.height = altezza
    const ctx = tela.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, larghezza, altezza)
    bitmap.close()

    const blob = await new Promise<Blob | null>(risolvi =>
      tela.toBlob(risolvi, 'image/jpeg', QUALITA)
    )
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

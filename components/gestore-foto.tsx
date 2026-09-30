'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CONTENITORE_FOTO, elencoFoto, riduciImmagine, urlFoto } from '@/lib/foto'
import { IconaPiu } from '@/components/icone'

/**
 * Foto di un annuncio: caricamento, copertina, eliminazione.
 *
 * Ogni azione va a segno subito, senza un bottone "salva": caricare una foto e
 * poi dimenticarsi di confermare è un modo sicuro di perderla. L'elenco tenuto
 * qui è la copia di lavoro, e viene riallineato solo quando il database
 * conferma.
 *
 * I file finiscono in una cartella intitolata all'annuncio: è da quel percorso
 * che le regole del database capiscono di quale agenzia sono e decidono chi
 * può scriverci.
 */
export default function GestoreFoto({
  listingId,
  fotoIniziali,
}: {
  listingId: string
  fotoIniziali: unknown
}) {
  const t = useTranslations('listings.detail')
  const [foto, setFoto] = useState<string[]>(elencoFoto(fotoIniziali))
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function salvaElenco(nuovo: string[]) {
    const supabase = createClient()
    const { error } = await supabase.from('listings').update({ foto: nuovo }).eq('id', listingId)
    if (error) throw error
    setFoto(nuovo)
  }

  async function aggiungi(files: FileList | null) {
    if (!files || files.length === 0) return
    setErrore(null)
    setInCorso(true)
    const supabase = createClient()
    const caricate: string[] = []

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setErrore(t('photosNotImage'))
          continue
        }

        // null significa che non si è riusciti a portarla sotto il tetto del
        // contenitore: inutile tentare il caricamento, verrebbe respinto dal
        // server con un errore molto meno comprensibile di questo.
        const ridotta = await riduciImmagine(file)
        if (!ridotta) {
          setErrore(t('photosTooBig'))
          continue
        }

        const percorso = `${listingId}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage
          .from(CONTENITORE_FOTO)
          .upload(percorso, ridotta, { contentType: 'image/jpeg', upsert: false })
        if (error) throw error
        caricate.push(percorso)
      }

      if (caricate.length > 0) await salvaElenco([...foto, ...caricate])
    } catch {
      setErrore(t('photosError'))
      // Tolgo dal contenitore quello che era già salito: senza questo
      // resterebbero file orfani, invisibili e impossibili da cancellare
      // dall'interfaccia.
      if (caricate.length > 0) {
        await supabase.storage.from(CONTENITORE_FOTO).remove(caricate).catch(() => {})
      }
    } finally {
      setInCorso(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function elimina(percorso: string) {
    setErrore(null)
    const supabase = createClient()
    try {
      await salvaElenco(foto.filter(f => f !== percorso))
      await supabase.storage.from(CONTENITORE_FOTO).remove([percorso])
    } catch {
      setErrore(t('photosError'))
    }
  }

  async function metteInCopertina(percorso: string) {
    setErrore(null)
    try {
      await salvaElenco([percorso, ...foto.filter(f => f !== percorso)])
    } catch {
      setErrore(t('photosError'))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-text text-[15px] font-semibold">{t('photosTitle')}</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={inCorso}
          className="border-border text-text-secondary inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium disabled:opacity-50"
        >
          <IconaPiu className="h-3.5 w-3.5" />
          {inCorso ? t('photosUploading') : t('photosAdd')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => aggiungi(e.target.files)}
        />
      </div>

      {errore && (
        <p className="border-danger/35 bg-danger/10 text-danger mb-4 rounded-lg border px-3.5 py-2.5 text-[13px]">
          {errore}
        </p>
      )}

      {foto.length === 0 ? (
        <p className="text-text-tertiary border-border rounded-lg border border-dashed px-4 py-8 text-center text-[13px]">
          {t('photosEmpty')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {foto.map((percorso, i) => (
            <figure key={percorso} className="group border-border relative overflow-hidden rounded-lg border">
              <Image
                src={urlFoto(percorso)}
                alt=""
                width={400}
                height={300}
                className="aspect-4/3 w-full object-cover"
              />

              {i === 0 && (
                <figcaption className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {t('photosCover')}
                </figcaption>
              )}

              {/* Le azioni compaiono al passaggio del mouse; su schermo
                  tattile, dove il passaggio non esiste, restano sempre
                  visibili. */}
              <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => metteInCopertina(percorso)}
                    className="rounded bg-white/90 px-2 py-1 text-[11px] font-medium text-black"
                  >
                    {t('photosSetCover')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => elimina(percorso)}
                  className="bg-danger ml-auto rounded px-2 py-1 text-[11px] font-medium text-white"
                >
                  {t('photosDelete')}
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

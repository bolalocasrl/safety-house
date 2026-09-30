'use client'

import { useState } from 'react'
import Image from 'next/image'
import { elencoFoto, urlFoto } from '@/lib/foto'

/**
 * Le foto dell'annuncio nella pagina di candidatura.
 *
 * Foto grande in alto, miniature sotto per cambiarla. Se l'annuncio non ha
 * foto non disegna nulla: uno spazio vuoto con scritto "nessuna immagine"
 * darebbe solo l'impressione che qualcosa si sia rotto.
 */
export default function GalleriaAnnuncio({ foto }: { foto: unknown }) {
  const immagini = elencoFoto(foto)
  const [scelta, setScelta] = useState(0)

  if (immagini.length === 0) return null

  const attiva = immagini[Math.min(scelta, immagini.length - 1)]

  return (
    <div className="mb-4">
      <div className="border-border relative overflow-hidden rounded-lg border">
        <Image
          src={urlFoto(attiva)}
          alt=""
          width={640}
          height={480}
          priority
          className="aspect-4/3 w-full object-cover"
        />
      </div>

      {immagini.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {immagini.map((percorso, i) => (
            <button
              key={percorso}
              type="button"
              onClick={() => setScelta(i)}
              aria-current={i === scelta}
              className={`shrink-0 overflow-hidden rounded border transition-opacity ${
                i === scelta ? 'border-primary' : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={urlFoto(percorso)}
                alt=""
                width={64}
                height={48}
                className="h-12 w-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

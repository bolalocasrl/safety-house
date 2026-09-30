/**
 * Elenco dei paesi per i campi "nazionalità" e "prefisso telefonico".
 *
 * I nomi non sono scritti qui e non sono tradotti a mano: li chiede il
 * browser con Intl.DisplayNames, che li conosce già in tutte le lingue.
 * Mantenere quattro elenchi di duecento paesi nei file di traduzione sarebbe
 * stato un peso inutile e una fonte sicura di disallineamenti.
 *
 * La selezione copre l'Unione Europea più i paesi di origine più frequenti
 * tra i residenti in Spagna: è un modulo per affitti a Barcellona, non un
 * atlante. Se manca un paese si aggiunge una riga qui.
 */

export type Paese = { codice: string; prefisso: string }

/** In cima all'elenco, perché sono i più probabili per questo mercato. */
export const PAESI_FREQUENTI = ['ES', 'MA', 'RO', 'CO', 'IT', 'VE', 'AR', 'GB']

export const PAESI: Paese[] = [
  { codice: 'ES', prefisso: '+34'  },
  { codice: 'MA', prefisso: '+212' },
  { codice: 'RO', prefisso: '+40'  },
  { codice: 'CO', prefisso: '+57'  },
  { codice: 'IT', prefisso: '+39'  },
  { codice: 'VE', prefisso: '+58'  },
  { codice: 'AR', prefisso: '+54'  },
  { codice: 'GB', prefisso: '+44'  },
  { codice: 'PE', prefisso: '+51'  },
  { codice: 'EC', prefisso: '+593' },
  { codice: 'BO', prefisso: '+591' },
  { codice: 'CL', prefisso: '+56'  },
  { codice: 'UY', prefisso: '+598' },
  { codice: 'PY', prefisso: '+595' },
  { codice: 'BR', prefisso: '+55'  },
  { codice: 'MX', prefisso: '+52'  },
  { codice: 'CU', prefisso: '+53'  },
  { codice: 'DO', prefisso: '+1'   },
  { codice: 'HN', prefisso: '+504' },
  { codice: 'NI', prefisso: '+505' },
  { codice: 'SV', prefisso: '+503' },
  { codice: 'GT', prefisso: '+502' },
  { codice: 'CR', prefisso: '+506' },
  { codice: 'PA', prefisso: '+507' },
  { codice: 'US', prefisso: '+1'   },
  { codice: 'PT', prefisso: '+351' },
  { codice: 'FR', prefisso: '+33'  },
  { codice: 'DE', prefisso: '+49'  },
  { codice: 'NL', prefisso: '+31'  },
  { codice: 'BE', prefisso: '+32'  },
  { codice: 'IE', prefisso: '+353' },
  { codice: 'AT', prefisso: '+43'  },
  { codice: 'CH', prefisso: '+41'  },
  { codice: 'SE', prefisso: '+46'  },
  { codice: 'NO', prefisso: '+47'  },
  { codice: 'DK', prefisso: '+45'  },
  { codice: 'FI', prefisso: '+358' },
  { codice: 'PL', prefisso: '+48'  },
  { codice: 'CZ', prefisso: '+420' },
  { codice: 'SK', prefisso: '+421' },
  { codice: 'HU', prefisso: '+36'  },
  { codice: 'HR', prefisso: '+385' },
  { codice: 'SI', prefisso: '+386' },
  { codice: 'BG', prefisso: '+359' },
  { codice: 'GR', prefisso: '+30'  },
  { codice: 'LT', prefisso: '+370' },
  { codice: 'LV', prefisso: '+371' },
  { codice: 'EE', prefisso: '+372' },
  { codice: 'UA', prefisso: '+380' },
  { codice: 'RU', prefisso: '+7'   },
  { codice: 'TR', prefisso: '+90'  },
  { codice: 'DZ', prefisso: '+213' },
  { codice: 'TN', prefisso: '+216' },
  { codice: 'SN', prefisso: '+221' },
  { codice: 'NG', prefisso: '+234' },
  { codice: 'GM', prefisso: '+220' },
  { codice: 'GH', prefisso: '+233' },
  { codice: 'ML', prefisso: '+223' },
  { codice: 'CN', prefisso: '+86'  },
  { codice: 'IN', prefisso: '+91'  },
  { codice: 'PK', prefisso: '+92'  },
  { codice: 'BD', prefisso: '+880' },
  { codice: 'PH', prefisso: '+63'  },
]

/**
 * Bandiera come emoji, ricavata dal codice del paese.
 *
 * Le due lettere vengono spostate nel blocco Unicode dei "regional indicator":
 * ES → 🇪🇸. Nessuna immagine da caricare e nessun file da mantenere.
 */
export function bandiera(codice: string): string {
  return codice
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

/**
 * Nome del paese nella lingua dell'utente.
 *
 * Accetta anche valori che non sono codici: i candidati inseriti prima che
 * questo campo diventasse un elenco hanno la nazionalità scritta a mano
 * ("Española"), e va mostrata così com'è invece di sparire.
 */
export function nomePaese(valore: string | null | undefined, locale: string): string {
  if (!valore) return ''
  if (!/^[A-Z]{2}$/.test(valore)) return valore
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(valore) ?? valore
  } catch {
    return valore
  }
}

/** Paesi ordinati: prima i più frequenti, poi tutti gli altri in ordine alfabetico. */
export function paesiOrdinati(locale: string): Paese[] {
  const frequenti = PAESI_FREQUENTI
    .map(c => PAESI.find(p => p.codice === c))
    .filter((p): p is Paese => Boolean(p))

  const resto = PAESI
    .filter(p => !PAESI_FREQUENTI.includes(p.codice))
    .sort((a, b) => nomePaese(a.codice, locale).localeCompare(nomePaese(b.codice, locale), locale))

  return [...frequenti, ...resto]
}

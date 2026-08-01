export type DocumentStatus = 'verified' | 'suspicious' | 'fraudulent'

export type CandidateInput = {
  monthly_income: number
  has_pets: boolean
  smoker: boolean
  num_occupants: number
  vida_laboral_csv_code: string | null
  document_status: DocumentStatus
}

export type ListingInput = {
  monthly_rent: number
  owner_requirements: {
    no_pets?: boolean
    no_smokers?: boolean
    max_occupants?: number
    min_income_ratio?: number
  } | null
}

export type ScoreBreakdown = {
  solvency: number  // raw 0-10
  matching: number  // raw 0-10
  fraud: number     // raw 0-10
  total: number     // weighted 1-10
}

export function calculateScore(candidate: CandidateInput, listing: ListingInput): ScoreBreakdown {
  // Solvibilità 40% — ratio reddito / affitto
  const ratio = listing.monthly_rent > 0 ? candidate.monthly_income / listing.monthly_rent : 0
  let solvency: number
  if (ratio >= 3)        solvency = 10
  else if (ratio >= 2.5) solvency = 7
  else if (ratio >= 2)   solvency = 5
  else                   solvency = 2

  // Matching 20% — penalità per requisiti non rispettati
  const req = listing.owner_requirements ?? {}
  let matching = 10
  if (req.no_pets     && candidate.has_pets)                                       matching -= 3
  if (req.no_smokers  && candidate.smoker)                                          matching -= 3
  if (req.max_occupants != null && candidate.num_occupants > req.max_occupants)    matching -= 2
  matching = Math.max(0, matching)

  // Antifrode 40% — deriva dall'esito reale della verifica documentale (document_status):
  // fraudolento azzera la componente (trascina il punteggio totale in zona rossa anche
  // se solvibilità/matching sono buoni), sospetto applica una penalità media, verificato
  // resta pieno con un piccolo premio se è presente anche il CSV Vida Laboral.
  let fraud: number
  if (candidate.document_status === 'fraudulent')       fraud = 0
  else if (candidate.document_status === 'suspicious')  fraud = 4
  else                                                   fraud = candidate.vida_laboral_csv_code ? 10 : 6

  // Score pesato, clampato [1, 10], arrotondato a 1 decimale
  const raw = solvency * 0.40 + matching * 0.20 + fraud * 0.40
  const total = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10

  return { solvency, matching, fraud, total }
}

/**
 * Seed demo — Fase 2.
 *
 * Popola una scena demo curata e ripetibile per l'agenzia di test
 * (login: safetyhouse26@gmail.com): 3 annunci a Barcellona (Eixample/Gràcia)
 * e 8 candidati con una gerarchia narrativa precisa (top → medi → borderline
 * → frode). Gli score sono calcolati con la VERA calculateScore() — non sono
 * numeri finti, derivano da reddito, matching e document_status di ciascun
 * candidato esattamente come farebbe il bottone "Calcola Score" in app.
 *
 * Idempotente: rilanciandolo aggiorna gli annunci/candidati/candidature
 * esistenti (match su titolo annuncio ed email candidato) invece di
 * duplicarli.
 *
 * Uso:
 *   node scripts/seed-demo.ts
 *
 * Richiede in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { calculateScore, type DocumentStatus } from '../lib/scoring/algorithm.ts'

// ---------------------------------------------------------------------------
// Caricamento .env.local (script standalone, fuori dal runtime Next.js)
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const envPath = path.join(here, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠ File .env.local non trovato in ${envPath} — mi affido a variabili d'ambiente già presenti.`)
    return
  }
  for (const rawLine of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✗ Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY (controlla .env.local).')
  process.exit(1)
}

const db = createAdminClient()

// ---------------------------------------------------------------------------
// Dati della scena demo
// ---------------------------------------------------------------------------

const AGENCY_LOGIN_EMAIL = 'matteo.leads99@gmail.com'

type OwnerRequirements = {
  no_pets?: boolean
  no_smokers?: boolean
  max_occupants?: number
  min_income_ratio?: number
}

type ListingSeed = {
  key: string
  title: string
  address: string
  city: string
  monthly_rent: number
  rooms: number
  owner_requirements: OwnerRequirements
}

const LISTINGS: ListingSeed[] = [
  {
    key: 'loft-eixample',
    title: 'Loft Eixample — Consell de Cent',
    address: 'Carrer del Consell de Cent, 245, 2º 1ª',
    city: 'Barcelona',
    monthly_rent: 1600,
    rooms: 1,
    owner_requirements: { no_smokers: true, max_occupants: 2, min_income_ratio: 3 },
  },
  {
    key: 'bilocale-gracia',
    title: 'Bilocale Gràcia — Carrer de Verdi',
    address: 'Carrer de Verdi, 88, 1º',
    city: 'Barcelona',
    monthly_rent: 1100,
    rooms: 2,
    owner_requirements: { max_occupants: 2, min_income_ratio: 3 },
  },
  {
    key: 'trilocale-eixample',
    title: 'Trilocale Eixample — Carrer de Provença',
    address: 'Carrer de Provença, 312, 3º 2ª',
    city: 'Barcelona',
    monthly_rent: 1400,
    rooms: 3,
    owner_requirements: { no_pets: true, max_occupants: 3, min_income_ratio: 3 },
  },
]

type CandidateSeed = {
  key: string
  role: string // solo per il log, non persistito
  email: string
  full_name: string
  phone: string
  dni_nie: string
  nationality: string
  employment_type: 'employed' | 'self_employed' | 'student' | 'retired'
  contract_type: 'indefinido' | 'temporal' | 'autonomo'
  monthly_income: number
  has_pets: boolean
  smoker: boolean
  num_occupants: number
  extra_notes: string | null
  vida_laboral_csv_code: string | null
  document_status: DocumentStatus
  listingKey: string // annuncio a cui si candida
}

const CANDIDATES: CandidateSeed[] = [
  {
    key: 'laura',
    role: 'TOP',
    email: 'laura.martinez@safetyhouse-demo.test',
    full_name: 'Laura Martínez Soler',
    phone: '+34 611 234 567',
    dni_nie: '47852136Q',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'indefinido',
    monthly_income: 5000,
    has_pets: false,
    smoker: true,
    num_occupants: 1,
    extra_notes: 'Disponible para mudanza inmediata. Sin mascotas.',
    vida_laboral_csv_code: 'HCQIN-D2BSU-XZIKJ-NWT5R-WFP2H-LM3QA',
    document_status: 'verified',
    listingKey: 'loft-eixample',
  },
  {
    key: 'marc',
    role: 'MEDIO',
    email: 'marc.puig@safetyhouse-demo.test',
    full_name: 'Marc Puig Ferrer',
    phone: '+34 622 345 678',
    dni_nie: '39215487T',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'indefinido',
    monthly_income: 2800,
    has_pets: false,
    smoker: false,
    num_occupants: 1,
    extra_notes: null,
    vida_laboral_csv_code: null,
    document_status: 'verified',
    listingKey: 'bilocale-gracia',
  },
  {
    key: 'ariadna',
    role: 'MEDIO',
    email: 'ariadna.roig@safetyhouse-demo.test',
    full_name: 'Ariadna Roig Puigdemont',
    phone: '+34 633 456 789',
    dni_nie: '52147896W',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'temporal',
    monthly_income: 3200,
    has_pets: true,
    smoker: false,
    num_occupants: 2,
    extra_notes: 'Vive con su pareja. Tiene un gato.',
    vida_laboral_csv_code: 'K9XZP-4MRTV-QW2LN-8FBGH-YUX3E-P7VDK',
    document_status: 'verified',
    listingKey: 'trilocale-eixample',
  },
  {
    key: 'jordi',
    role: 'MEDIO (documento sospechoso)',
    email: 'jordi.camps@safetyhouse-demo.test',
    full_name: 'Jordi Camps Vidal',
    phone: '+34 644 567 890',
    dni_nie: '41236987P',
    nationality: 'ES',
    employment_type: 'self_employed',
    contract_type: 'autonomo',
    monthly_income: 4800,
    has_pets: false,
    smoker: true,
    num_occupants: 1,
    extra_notes: 'Autónomo (diseño gráfico). Documentación en revisión.',
    vida_laboral_csv_code: 'T5KXN-3QWPL-9YHZR-XM2BV-4RFDK-8NQTL',
    document_status: 'suspicious',
    listingKey: 'loft-eixample',
  },
  {
    key: 'nuria',
    role: 'MEDIO',
    email: 'nuria.serra@safetyhouse-demo.test',
    full_name: 'Núria Serra Comas',
    phone: '+34 655 678 901',
    dni_nie: '46589712L',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'indefinido',
    monthly_income: 2500,
    has_pets: false,
    smoker: false,
    num_occupants: 3,
    extra_notes: 'Familia con un hijo pequeño.',
    vida_laboral_csv_code: 'B3NQX-7YHWK-2MTPL-9RCVF-XZ4JD-QW8YN',
    document_status: 'verified',
    listingKey: 'bilocale-gracia',
  },
  {
    key: 'sergi',
    role: 'BORDERLINE',
    email: 'sergi.font@safetyhouse-demo.test',
    full_name: 'Sergi Font Batlle',
    phone: '+34 666 789 012',
    dni_nie: '43125698H',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'temporal',
    monthly_income: 2400,
    has_pets: false,
    smoker: false,
    num_occupants: 1,
    extra_notes: null,
    vida_laboral_csv_code: null,
    document_status: 'verified',
    listingKey: 'trilocale-eixample',
  },
  {
    key: 'meritxell',
    role: 'BORDERLINE',
    email: 'meritxell.alonso@safetyhouse-demo.test',
    full_name: 'Meritxell Alonso Bruguera',
    phone: '+34 677 890 123',
    dni_nie: '45789632Z',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'temporal',
    monthly_income: 2600,
    has_pets: false,
    smoker: true,
    num_occupants: 1,
    extra_notes: null,
    vida_laboral_csv_code: null,
    document_status: 'verified',
    listingKey: 'loft-eixample',
  },
  {
    key: 'ivan',
    role: 'FRODE',
    email: 'ivan.rodriguez@safetyhouse-demo.test',
    full_name: 'Iván Rodríguez Cabrera',
    phone: '+34 688 901 234',
    dni_nie: '48963217X',
    nationality: 'ES',
    employment_type: 'employed',
    contract_type: 'temporal',
    monthly_income: 2200,
    has_pets: false,
    smoker: true,
    num_occupants: 1,
    extra_notes: 'Camarero con contrato estable, disponible para entrar cuanto antes.',
    vida_laboral_csv_code: null,
    document_status: 'fraudulent',
    listingKey: 'loft-eixample',
  },
]

// ---------------------------------------------------------------------------
// Helpers DB
// ---------------------------------------------------------------------------

async function findAgencyContext(loginEmail: string): Promise<{ agencyId: string; agentId: string }> {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers fallita: ${error.message}`)

    const match = data.users.find(u => u.email?.toLowerCase() === loginEmail.toLowerCase())
    if (match) {
      const { data: userRow, error: userRowError } = await db
        .from('users')
        .select('agency_id')
        .eq('id', match.id)
        .single()

      if (userRowError || !userRow?.agency_id) {
        throw new Error(`Utente auth trovato per ${loginEmail} ma nessuna riga in "users" con agency_id. Verifica che l'account sia stato inserito manualmente in "users" come da PROJECT.md.`)
      }
      return { agencyId: userRow.agency_id, agentId: match.id }
    }

    if (data.users.length < perPage) break
    page++
  }
  throw new Error(`Nessun utente Supabase Auth trovato con email ${loginEmail}. Crea/verifica l'account agenzia prima di lanciare il seed.`)
}

async function upsertListing(agencyId: string, agentId: string, seed: ListingSeed): Promise<string> {
  const { data: existing, error: findError } = await db
    .from('listings')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('title', seed.title)
    .maybeSingle()

  if (findError) throw new Error(`Ricerca annuncio "${seed.title}" fallita: ${findError.message}`)

  if (existing) {
    const { error } = await db
      .from('listings')
      .update({
        address: seed.address,
        city: seed.city,
        monthly_rent: seed.monthly_rent,
        rooms: seed.rooms,
        owner_requirements: seed.owner_requirements,
        status: 'active',
      })
      .eq('id', existing.id)
    if (error) throw new Error(`Aggiornamento annuncio "${seed.title}" fallito: ${error.message}`)
    return existing.id
  }

  const { data: created, error } = await db
    .from('listings')
    .insert({
      title: seed.title,
      address: seed.address,
      city: seed.city,
      monthly_rent: seed.monthly_rent,
      rooms: seed.rooms,
      agency_id: agencyId,
      agent_id: agentId,
      status: 'active',
      owner_requirements: seed.owner_requirements,
      public_link_token: crypto.randomUUID(),
    })
    .select('id')
    .single()

  if (error || !created) throw new Error(`Creazione annuncio "${seed.title}" fallita: ${error?.message}`)
  return created.id
}

async function upsertCandidate(seed: CandidateSeed): Promise<string> {
  const { data: existing, error: findError } = await db
    .from('candidates')
    .select('id')
    .eq('email', seed.email)
    .maybeSingle()

  if (findError) throw new Error(`Ricerca candidato "${seed.email}" fallita: ${findError.message}`)

  let candidateId: string
  if (existing) {
    candidateId = existing.id
  } else {
    // Crea un utente Supabase Auth reale: il trigger handle_new_user() genera
    // automaticamente la riga in "candidates", che completiamo subito dopo.
    const { data: created, error } = await db.auth.admin.createUser({
      email: seed.email,
      email_confirm: true,
      user_metadata: { full_name: seed.full_name, demo_seed: true },
    })
    if (error || !created?.user) {
      throw new Error(`Creazione utente demo "${seed.email}" fallita: ${error?.message}`)
    }
    candidateId = created.user.id
  }

  const { error: updateError } = await db
    .from('candidates')
    .update({
      full_name: seed.full_name,
      email: seed.email,
      phone: seed.phone,
      dni_nie: seed.dni_nie,
      nationality: seed.nationality,
      employment_type: seed.employment_type,
      contract_type: seed.contract_type,
      monthly_income: seed.monthly_income,
      has_pets: seed.has_pets,
      smoker: seed.smoker,
      num_occupants: seed.num_occupants,
      extra_notes: seed.extra_notes,
      vida_laboral_csv_code: seed.vida_laboral_csv_code,
      document_status: seed.document_status,
    })
    .eq('id', candidateId)

  if (updateError) throw new Error(`Aggiornamento profilo candidato "${seed.email}" fallito: ${updateError.message}`)
  return candidateId
}

async function upsertApplication(listingId: string, candidateId: string, score: number) {
  const { error } = await db
    .from('applications')
    .upsert(
      { listing_id: listingId, candidate_id: candidateId, status: 'pending', safety_score: score },
      { onConflict: 'listing_id,candidate_id' }
    )
  if (error) throw new Error(`Upsert candidatura fallito: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('── Seed demo Safety House — Fase 2 ──\n')

  const { agencyId, agentId } = await findAgencyContext(AGENCY_LOGIN_EMAIL)
  console.log(`Agenzia trovata (agency_id=${agencyId})\n`)

  const listingIds: Record<string, string> = {}
  for (const l of LISTINGS) {
    listingIds[l.key] = await upsertListing(agencyId, agentId, l)
    console.log(`✓ annuncio  ${l.title}  —  ${l.monthly_rent}€/mese`)
  }

  console.log('')

  for (const c of CANDIDATES) {
    const candidateId = await upsertCandidate(c)
    const listingSeed = LISTINGS.find(l => l.key === c.listingKey)!
    const listingId = listingIds[c.listingKey]

    const breakdown = calculateScore(
      {
        monthly_income: c.monthly_income,
        has_pets: c.has_pets,
        smoker: c.smoker,
        num_occupants: c.num_occupants,
        vida_laboral_csv_code: c.vida_laboral_csv_code,
        document_status: c.document_status,
      },
      {
        monthly_rent: listingSeed.monthly_rent,
        owner_requirements: listingSeed.owner_requirements,
      }
    )

    await upsertApplication(listingId, candidateId, breakdown.total)

    const { error: scoreError } = await db
      .from('candidates')
      .update({ safety_score: breakdown.total })
      .eq('id', candidateId)
    if (scoreError) throw new Error(`Aggiornamento safety_score candidato "${c.email}" fallito: ${scoreError.message}`)

    console.log(
      `✓ candidato  ${c.full_name.padEnd(26)} [${c.role.padEnd(24)}] → ${listingSeed.title.padEnd(28)} → score ${breakdown.total.toFixed(1)} ` +
      `(solv=${breakdown.solvency} match=${breakdown.matching} fraud=${breakdown.fraud}, doc=${c.document_status})`
    )
  }

  console.log('\n── Seed completato. Riavvia pure lo script in qualsiasi momento: aggiorna invece di duplicare. ──')
}

main().catch(err => {
  console.error('\n✗ Seed fallito:', err instanceof Error ? err.message : err)
  process.exit(1)
})

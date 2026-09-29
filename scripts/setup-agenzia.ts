/**
 * Setup agenzia — crea l'account con cui si entra in Safety House come agenzia.
 *
 * Fa tre cose, nell'ordine:
 *   1. crea l'utente di login (se non esiste già) con email confermata,
 *      così il link magico funziona subito senza passaggi manuali
 *   2. crea l'agenzia
 *   3. collega i due inserendo la riga in "users" con ruolo direttore
 *
 * Il passaggio 3 è quello che va fatto per forza a mano: il trigger
 * handle_new_user() crea in automatico solo il profilo candidato, mai la riga
 * agente/direttore. Senza, il login riesce ma l'app non sa a quale agenzia
 * appartieni e ogni pagina resta vuota.
 *
 * Idempotente: rilanciandolo aggiorna invece di duplicare. Va eseguito prima
 * di seed-demo.ts, che dà per scontato che l'agenzia esista già.
 *
 * Uso:
 *   node scripts/setup-agenzia.ts
 *
 * Richiede in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAdminClient } from '../lib/supabase/admin.ts'

// Deve combaciare con AGENCY_LOGIN_EMAIL in seed-demo.ts.
const EMAIL_AGENZIA = 'matteo.leads99@gmail.com'
const NOME_AGENZIA = 'Agenzia Demo Barcellona'
const NOME_DIRETTORE = 'Matteo'

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

async function trovaOCreaUtenteLogin(email: string): Promise<string> {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers fallita: ${error.message}`)

    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (match) {
      console.log(`· utente di login già presente (${email})`)
      return match.id
    }
    if (data.users.length < perPage) break
    page++
  }

  const { data: creato, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: NOME_DIRETTORE },
  })
  if (error || !creato?.user) throw new Error(`Creazione utente "${email}" fallita: ${error?.message}`)
  console.log(`✓ utente di login creato (${email})`)
  return creato.user.id
}

async function trovaOCreaAgenzia(nome: string): Promise<string> {
  const { data: esistente, error: erroreRicerca } = await db
    .from('agencies')
    .select('id')
    .eq('name', nome)
    .maybeSingle()
  if (erroreRicerca) throw new Error(`Ricerca agenzia fallita: ${erroreRicerca.message}`)

  if (esistente) {
    console.log(`· agenzia già presente ("${nome}")`)
    return esistente.id
  }

  const { data: creata, error } = await db
    .from('agencies')
    .insert({ name: nome, plan: 'pro' })
    .select('id')
    .single()
  if (error || !creata) throw new Error(`Creazione agenzia fallita: ${error?.message}`)
  console.log(`✓ agenzia creata ("${nome}")`)
  return creata.id
}

async function collegaDirettore(userId: string, agencyId: string, email: string) {
  const { error } = await db
    .from('users')
    .upsert({
      id: userId,
      agency_id: agencyId,
      role: 'agency_director',
      full_name: NOME_DIRETTORE,
      email,
    })
  if (error) throw new Error(`Collegamento direttore ↔ agenzia fallito: ${error.message}`)
  console.log(`✓ ${email} collegato all'agenzia come direttore`)
}

async function main() {
  console.log('── Setup agenzia Safety House ──\n')

  const userId = await trovaOCreaUtenteLogin(EMAIL_AGENZIA)
  const agencyId = await trovaOCreaAgenzia(NOME_AGENZIA)
  await collegaDirettore(userId, agencyId, EMAIL_AGENZIA)

  console.log(`\n── Fatto. Entra su /login con ${EMAIL_AGENZIA} e richiedi il link magico. ──`)
}

main().catch(err => {
  console.error('\n✗ Setup fallito:', err instanceof Error ? err.message : err)
  process.exit(1)
})

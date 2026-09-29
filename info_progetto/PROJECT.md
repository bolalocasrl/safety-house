# 🏠 SAFETY HOUSE — PROJECT STATUS

> **Ultimo aggiornamento:** 29/09/2026 (ricostruzione database)  
> **Istruzioni per Claude VS Code:** Leggi questo file all'inizio di ogni sessione prima di fare qualsiasi cosa. Aggiornalo dopo ogni modifica importante.

---

## 📋 DESCRIZIONE PROGETTO

Safety House è una piattaforma SaaS CRM verticale per la gestione del ciclo di vita degli affitti in Spagna (Barcellona). Automatizza lo screening degli inquilini, la verifica antifrode dei documenti e il workflow burocratico post-selezione.

**Il problema:** Le agenzie immobiliari ricevono 100+ richieste per annuncio, i candidati mandano documenti falsi via WhatsApp (violazione GDPR), gli agenti perdono il 70% del tempo in burocrazia.

**La soluzione:** Middleware di fiducia tra inquilino e agenzia con verifica antifrode governativa (Vida Laboral CSV), scoring automatico e workflow guidato.

**Team:** Matteo (Strategy/BD) · Eduardo (Tech) · David (Legal) · Mate (Ops)  
**Deadline MVP:** Agosto 2026

---

## 🛠️ STACK TECNICO

| Layer | Tecnologia |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript strict |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Supabase Magic Link (no password) |
| Deploy | Vercel (frontend) + Supabase Cloud (backend) |
| Email | Resend |
| PDF | @react-pdf/renderer |
| i18n | next-intl (ES/IT/EN/CA) |

---

## 🎨 DESIGN SYSTEM

| Token | Valore |
|-------|--------|
| Background | `#0D1117` |
| Surface/Card | `#1C2230` |
| Border | `#2E3540` |
| Primary Blue | `#1060E8` |
| Text Secondary | `#6B7585` |
| Success | `#1BA35A` |
| Warning | `#E89210` |
| Danger | `#E83B2D` |
| Font Display | Sora (`--font-sora`, `next/font/google`) |
| Font Body | DM Sans (`--font-dm-sans`, `next/font/google`) |

---

## 👥 RUOLI UTENTE (RBAC)

| Ruolo | Codice | Accesso |
|-------|--------|---------|
| Direttore Agenzia | `agency_director` | Tutto + billing |
| Direttore Filiale | `branch_director` | Solo sua filiale |
| Agente | `agent` | Proprie pratiche |
| Candidato | `candidate` | Proprio profilo |

---

## 🗄️ DATABASE (Supabase)

**Tabelle create:**
- `agencies` — agenzie con piano abbonamento
- `branches` — filiali per agenzia
- `users` — agenti/direttori (separati da candidates)
- `candidates` — profili inquilini con scoring (`safety_score`, `vida_laboral_csv_code`)
- `listings` — annunci immobiliari
- `applications` — candidature (listing ↔ candidate), con `safety_score`
- `procedures` — workflow post-selezione 5 step

**⚠️ Lo schema vive nel repo, non nel pannello.** Da settembre 2026 le tabelle,
le policy RLS e il trigger sono ricreabili da zero con le migrazioni in
`supabase/migrations/`, eseguite in ordine numerico. Prima esistevano solo
dentro il pannello Supabase: quando il progetto è stato sospeso non c'era modo
di ricostruirle, e sono andate ricavate leggendo le query del codice. Ogni
modifica futura allo schema va scritta come nuova migrazione numerata, mai
solo cliccata nel pannello.

**Colonne aggiunte manualmente (storico — oggi incluse in `001_schema_iniziale.sql`):**
```sql
ALTER TABLE candidates  ADD COLUMN IF NOT EXISTS safety_score          numeric(4,2);
ALTER TABLE candidates  ADD COLUMN IF NOT EXISTS vida_laboral_csv_code text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS safety_score         numeric(4,2);

CREATE TABLE IF NOT EXISTS procedures (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id         uuid        REFERENCES listings(id)   ON DELETE CASCADE,
  candidate_id       uuid        REFERENCES candidates(id) ON DELETE CASCADE,
  agency_id          uuid        REFERENCES agencies(id)   ON DELETE CASCADE,
  status             text        NOT NULL DEFAULT 'active',
  step_current       integer     NOT NULL DEFAULT 1,
  incasol_code       text,
  archive_expires_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procedures_agency_access" ON procedures
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
  );
```

**RLS:** Attiva su tutte le tabelle  
**Trigger:** `handle_new_user()` — crea automaticamente record in `candidates` per ogni nuovo auth.user  
**Admin client:** `lib/supabase/admin.ts` con service role key — bypassa RLS per operazioni server-side (scoring)

---

## 📁 STRUTTURA FILE PROGETTO

```
safety_house/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx                  ✅ Magic Link login
│   │   └── verify/page.tsx                 ✅ Redirect post-login (→ /apply/complete o /dashboard)
│   ├── (dashboard)/
│   │   ├── layout.tsx                      ✅ Sidebar + auth guard
│   │   ├── dashboard/page.tsx              ✅ Home con stats reali (listings, candidature, procedimenti)
│   │   ├── listings/
│   │   │   ├── page.tsx                    ✅ Lista annunci
│   │   │   ├── new/page.tsx                ✅ Form nuovo annuncio
│   │   │   └── [id]/page.tsx               ✅ Dettaglio + candidature + score + Avvia Procedimento
│   │   ├── candidates/
│   │   │   ├── page.tsx                    ✅ Lista candidati dell'agenzia con score
│   │   │   └── [id]/page.tsx               ✅ Profilo completo candidato (5 sezioni + candidature)
│   │   ├── procedures/
│   │   │   ├── page.tsx                    ✅ Lista procedimenti con barra progresso
│   │   │   └── [id]/page.tsx               ✅ Workflow 5 step visivo (Incasòl + archiviazione)
│   │   └── settings/
│   │       └── page.tsx                    ✅ Impostazioni (profilo, tema, lingua, piano, notifiche, logout)
│   ├── (candidate)/
│   │   └── apply/
│   │       ├── [token]/page.tsx            ✅ Form candidatura 4 step (+ CSV Vida Laboral + mock upload)
│   │       └── complete/page.tsx           ✅ Post-OTP: salva candidato + candidatura nel DB
│   └── api/
│       ├── listings/route.ts               ✅ POST crea annuncio
│       ├── scoring/route.ts                ✅ POST calcola e persiste safety_score (admin client)
│       ├── procedures/route.ts             ✅ POST crea procedimento
│       └── auth/logout/route.ts            ✅ Logout
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       ✅ Browser client (anon key)
│   │   ├── server.ts                       ✅ Server client (anon key + cookies)
│   │   └── admin.ts                        ✅ Admin client (service role, bypassa RLS)
│   └── scoring/
│       └── algorithm.ts                    ✅ calculateScore() — solvibilità 40% + matching 20% + antifrode 40%
├── scripts/
│   ├── setup-agenzia.ts                    ✅ Utente di login + agenzia + ruolo direttore
│   └── seed-demo.ts                        ✅ 3 annunci + 8 candidati con score reali
├── supabase/migrations/
│   ├── 001_schema_iniziale.sql             ✅ 7 tabelle + RLS + trigger nuovi iscritti
│   └── 002_document_status.sql             ✅ Esito verifica documentale
├── proxy.ts                                ✅ Auth guard middleware
└── .env.local                              ✅ (NON committare)
```

---

## 🗺️ ROADMAP SPRINT

### Sprint 1 — Fondamenta ✅ COMPLETATO
- [x] Setup Next.js 16 + TypeScript + Tailwind
- [x] Supabase configurato (DB EU, RLS attivo)
- [x] Schema database + 6 tabelle + RLS policies
- [x] Auth Magic Link funzionante
- [x] Pagina login + verify
- [x] Dashboard con sidebar e stats
- [x] GitHub repo + Vercel deploy automatico

### Sprint 2 — Listings & Candidature ✅ COMPLETATO (03/05/2026)
- [x] Pagina lista annunci (`/listings`)
- [x] Form nuovo annuncio (`/listings/new`)
- [x] Dettaglio annuncio (`/listings/[id]`)
- [x] Form candidatura pubblico 4 step (`/apply/[token]`)
- [x] Step 4: mock upload documenti (contratto, nómina, identità) + CSV Vida Laboral con validazione formato
- [x] Flusso auth Magic Link → `/verify` → `/apply/complete` funzionante
- [x] Fix timing: `getUser()` con fallback `onAuthStateChange` in `/apply/complete`
- [x] Testato end-to-end su Vercel il 03/05/2026
- [ ] Upload documenti reali (DNI, nómina, contratto) ❌ Sprint futuro

### Sprint 3 — Scoring Engine base ✅ COMPLETATO (04/05/2026)
- [x] `lib/scoring/algorithm.ts` — `calculateScore()` con 3 componenti pesati
- [x] Solvibilità 40%: ratio reddito/affitto → 10/7/5/2 punti
- [x] Matching 20%: penalità animali (-3), fumo (-3), occupanti (-2)
- [x] Antifrode 40%: CSV Vida Laboral presente → 6/10, assente → 3/10 (placeholder)
- [x] `POST /api/scoring` — calcola e persiste su `candidates.safety_score` + `applications.safety_score`
- [x] Fix RLS: admin client (`lib/supabase/admin.ts`) per bypassare policies sugli update server-side
- [x] Badge score colorato in `/listings/[id]` (verde >7, arancio 4-7, rosso <4)
- [ ] Parser CSV Vida Laboral reale ❌ Sprint futuro
- [ ] Score card candidato con breakdown dettagliato ❌ Sprint futuro

### Sprint 4 — Procedimenti & Dashboard ✅ COMPLETATO (04/05/2026)
- [x] Tabella `procedures` con RLS
- [x] `POST /api/procedures` — crea procedimento con agency_id server-side
- [x] `/procedures` — lista con barra progresso 1-5 e stato
- [x] `/procedures/[id]` — workflow visivo 5 step: Seguro de Impago → Contratto → Firma Digitale → Incasòl → Archiviazione
- [x] Step 4 Incasòl: campo 6 cifre obbligatorio con validazione
- [x] Step 5 Archiviazione: setta `status='completed'` + `archive_expires_at` (ora + 90 giorni)
- [x] Bottone "Avvia Procedimento" in `/listings/[id]` per ogni candidato
- [x] `/candidates` — lista candidati dell'agenzia con score, contratto, reddito, numero candidature
- [x] Dashboard: contatori reali (annunci attivi, candidature, procedimenti attivi) + ultimi 3 annunci
- [ ] Generazione contratto PDF ❌ Sprint futuro
- [ ] Integrazione firma digitale Signaturit ❌ Sprint futuro
- [ ] GDPR auto-delete 90gg ❌ Sprint futuro

### Sprint 5 — Multi-tenant & Billing ❌ Da fare
- [ ] Multi-filiale per agency_director
- [ ] Piani Starter €49/Pro €149/Enterprise €399
- [ ] Stripe integration
- [ ] i18n completo ES/IT/EN/CA

### Sprint 6 — Test & Launch ❌ Da fare
- [ ] Test con agenzia beta reale
- [ ] Bug fixing
- [ ] Performance optimization
- [ ] Deploy produzione + monitoring

---

## 🔜 DA FARE — PROSSIMA SESSIONE

**⚠️ DA RISOLVERE PRIMA DEL LANCIO — il link magico non funziona da un altro dispositivo**

Il login usa il flusso PKCE: quando si richiede il link, il browser conserva
una chiave di verifica, e senza quella l'accesso non si completa. Conseguenza:
il link **funziona solo nella stessa finestra del browser da cui è partito**.
Un candidato che compila la candidatura dal computer e apre la mail dal
telefono — comportamento normalissimo — non riesce a entrare, e non capisce
perché. A candidature reali è una perdita secca di utenti.

Soluzione: sostituire il link con un **codice numerico a 6 cifre** da digitare
(`verifyOtp` con `type: 'email'`), che funziona da qualsiasi dispositivo. In
alternativa si può tenere il link e aggiungere il codice come ripiego.
Nel frattempo `/verify` non resta più bloccata: dopo 10 secondi senza sessione
riporta al login.

**Difetti trovati durante la ricostruzione (piccoli, non ancora sistemati):**

- `app/(candidate)/apply/[token]/page.tsx` riga ~252: l'indirizzo di ritorno del
  link magico è scritto fisso (`https://safety-house-nine.vercel.app/verify`),
  mentre `login/page.tsx` lo calcola con `window.location.origin`. In locale la
  candidatura rimanda quindi al sito online. Va allineato al comportamento del
  login.
- `NEXT_PUBLIC_APP_URL` non era impostata su Vercel, quindi il logout in
  produzione era rotto (`new URL('/login', undefined)`). Risolto il 29/09/2026
  aggiungendo la variabile, ma vale la pena controllare che ogni variabile usata
  con `!` nel codice esista davvero in produzione.

> Il resto dei task delle sessioni precedenti è completato. Proposta Sprint 5:

1. **Multi-tenant filiali** — switch filiale nella sidebar, `branch_id` su listings/procedures
2. **Stripe Billing** — checkout Starter/Pro/Enterprise, webhook per aggiornare `agencies.plan`
3. **i18n** — `next-intl` per ES/IT/EN; tutte le label hardcoded in italiano da esternalizzare
4. **Upload reale documenti** — Supabase Storage, replace mock upload fields in `/apply/[token]`
5. **PDF contratto** — `@react-pdf/renderer`, generato in Step 3 del workflow procedimenti
6. **Score breakdown** — card nel profilo candidato (`/candidates/[id]`) con dettaglio solvibilità/matching/antifrode

---

## 🔧 CONFIGURAZIONE & CREDENZIALI

**Variabili ambiente (`.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xfvnwpuiakilblusjwdb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[publishable key]
SUPABASE_SERVICE_ROLE_KEY=[secret key]
SUPABASE_DB_URL=[stringa di connessione Postgres, solo per le migrazioni]
RESEND_API_KEY=[da configurare]
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Le stesse tre chiavi Supabase sono impostate su Vercel (production + preview),
insieme a `NEXT_PUBLIC_APP_URL=https://safety-house-nine.vercel.app`.

**URL:**
- Local: `http://localhost:3000`
- Production: `https://safety-house-nine.vercel.app`
- Supabase: `https://xfvnwpuiakilblusjwdb.supabase.co` (progetto `safety-house-crm`, Frankfurt)
- GitHub: `https://github.com/bolalocasrl/safety-house`

**⚠️ Il progetto Supabase sta su un account separato:** `matteo.leads99@gmail.com`,
organizzazione "Safety House". Non è lo stesso account di LeadCRM e LifeOS
(`bolalocasrl`), che sul piano gratuito è già al limite di 2 progetti attivi.
Per questo il connettore Supabase di Claude **non** vede questo database: le
migrazioni si eseguono dal terminale usando `SUPABASE_DB_URL`.

**Account di test:**
- Agency Director: `matteo.leads99@gmail.com` (creato da `scripts/setup-agenzia.ts`)
- Candidate: `bolalocasrl@gmail.com`

**Indirizzi di ritorno del link magico** (Supabase → Authentication → URL
Configuration): Site URL `https://safety-house-nine.vercel.app`, Redirect URLs
`https://safety-house-nine.vercel.app/**` e `http://localhost:3000/**`. Senza
questi il login via email non riporta all'app.

---

## ⚙️ COMANDI OPERATIVI

```bash
# Avvia server locale
cd ~/Desktop/PROGETTI/safety_house && npm run dev

# Push su GitHub (aggiorna Vercel automaticamente)
git add . && git commit -m "descrizione" && git push

# Ferma il server
Ctrl+C

# Ricreare il database da zero (nuovo progetto Supabase)
# 1. esegui in ordine i file di supabase/migrations/ sul nuovo database
# 2. poi, nell'ordine:
node scripts/setup-agenzia.ts   # utente di login + agenzia + ruolo direttore
node scripts/seed-demo.ts       # 3 annunci + 8 candidati con score reali
```
Entrambi gli script sono idempotenti: rilanciarli aggiorna invece di duplicare.
`setup-agenzia.ts` va sempre prima, perché il seed dà per scontato che
l'agenzia esista.

---

## ⚠️ NOTE IMPORTANTI

1. **Non usare** `export const unstable_instant` — non compatibile con Next.js 16
2. **Non usare** `onMouseEnter`/`onMouseLeave` nei Server Components
3. **Usa** `@/lib/supabase/server` nei Server Components
4. **Usa** `@/lib/supabase/client` nei Client Components (`'use client'`)
5. **Usa** `@/lib/supabase/admin` solo nelle API route server-side che devono bypassare RLS
6. **RLS policy** sulla tabella `users`: non fare subquery ricorsive su `users` stessa
7. **Il file** `proxy.ts` sostituisce `middleware.ts` in Next.js 16
8. **Trigger** `handle_new_user()` crea automaticamente un record in `candidates` — gli agenti vanno inseriti manualmente in `users`
9. **contract_type** valori validi: `indefinido` / `temporal` / `autonomo`
10. **employment_type** valori validi: `employed` / `self_employed` / `student` / `retired`
11. **Il piano gratuito Supabase sospende i progetti inattivi.** È già successo
    una volta (maggio → settembre 2026): i dati restano recuperabili per circa
    un anno, ma per riaccendere serve uno slot libero tra i 2 progetti attivi
    consentiti per account. Se il progetto diventa operativo, il piano Pro
    (~25$/mese) elimina sia il limite sia le sospensioni.
12. **La policy RLS su `users` non deve mai interrogare `users`.** Passa dalla
    funzione `agenzia_utente_corrente()` (SECURITY DEFINER), che legge la
    tabella scavalcando le sue stesse policy ed evita la ricorsione infinita.
    Stesso discorso per `candidato_visibile_ad_agenzia()`.
13. **La lettura anonima degli annunci attivi è voluta:** serve alla pagina
    pubblica `/apply/[token]`, che mostra l'annuncio a chi non ha ancora un
    account. È però più larga del necessario (espone tutti gli annunci attivi,
    non solo quello del token) — da restringere quando il prodotto va live.

---

## 📊 PRICING

| Piano | Prezzo | Target |
|-------|--------|--------|
| Starter | €49/mese | Agenzie piccole |
| Pro | €149/mese | Agenzie medie |
| Enterprise | €399/mese | Grandi agenzie |
| B2C | €9,90 una tantum | Candidato (fascicolo certificato) |

---

*Safety House · Documento Interno · Barcellona, 2026*

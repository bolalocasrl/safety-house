# 🏠 SAFETY HOUSE — PROJECT STATUS

> **Ultimo aggiornamento:** 03/05/2026 (sessione 2)  
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

**Colonne aggiunte manualmente (SQL da eseguire se non già fatto):**
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

> Tutti i task delle sessioni precedenti sono completati. Proposta Sprint 5:

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
NEXT_PUBLIC_SUPABASE_URL=https://zasjzybfimymhrxxyboc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[publishable key]
SUPABASE_SERVICE_ROLE_KEY=[secret key]
RESEND_API_KEY=[da configurare]
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**URL:**
- Local: `http://localhost:3000`
- Production: `https://safety-house-nine.vercel.app`
- Supabase: `https://zasjzybfimymhrxxyboc.supabase.co`
- GitHub: `https://github.com/bolalocasrl/safety-house`

**Account di test:**
- Agency Director: `safetyhouse26@gmail.com`
- Candidate: `bolalocasrl@gmail.com`

---

## ⚙️ COMANDI OPERATIVI

```bash
# Avvia server locale
cd ~/Desktop/PROGETTI/safety_house && npm run dev

# Push su GitHub (aggiorna Vercel automaticamente)
git add . && git commit -m "descrizione" && git push

# Ferma il server
Ctrl+C
```

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

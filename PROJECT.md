# 🏠 SAFETY HOUSE — PROJECT STATUS

> **Ultimo aggiornamento:** Maggio 2026  
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
| Font Display | Sora |
| Font Body | DM Sans |

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
- `candidates` — profili inquilini con scoring
- `listings` — annunci immobiliari
- `applications` — candidature (listing ↔ candidate)

**RLS:** Attiva su tutte le tabelle  
**Trigger:** `handle_new_user()` — crea automaticamente record in `candidates` per ogni nuovo auth.user

---

## 📁 STRUTTURA FILE PROGETTO

```
safety_house/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          ✅ Magic Link login
│   │   └── verify/page.tsx         ✅ Redirect post-login
│   ├── (dashboard)/
│   │   ├── layout.tsx              ✅ Sidebar + auth guard
│   │   ├── dashboard/page.tsx      ✅ Home con stats
│   │   ├── listings/
│   │   │   ├── page.tsx            ✅ Lista annunci
│   │   │   ├── new/page.tsx        ✅ Form nuovo annuncio
│   │   │   └── [id]/page.tsx       ✅ Dettaglio annuncio
│   │   ├── candidates/             ❌ Da fare
│   │   ├── procedures/             ❌ Da fare
│   │   └── settings/               ❌ Da fare
│   ├── (candidate)/
│   │   └── apply/[token]/page.tsx  ✅ Form candidatura pubblico
│   └── api/
│       ├── listings/route.ts       ✅ POST crea annuncio
│       └── auth/logout/route.ts    ✅ Logout
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ✅ Browser client
│   │   └── server.ts               ✅ Server client
├── proxy.ts                        ✅ Auth guard middleware
└── .env.local                      ✅ (NON committare)
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
- [x] Form candidatura pubblico (`/apply/[token]`)
- [x] Flusso auth Magic Link → `/verify` → `/apply/complete` funzionante
- [x] Testare flusso completo end-to-end _(testato su Vercel il 03/05/2026)_
- [ ] Upload documenti (DNI, nómina, contratto) ❌ Da fare nel prossimo sprint

### Sprint 3 — Scoring Engine ❌ Da fare
- [ ] Parser CSV Vida Laboral
- [ ] Algoritmo scoring (antifrode 40% + solvibilità 40% + matching 20%)
- [ ] Dashboard scoring agente
- [ ] Score card candidato con breakdown

### Sprint 4 — Procedimento Affitto ❌ Da fare
- [ ] Workflow post-selezione (5 step)
- [ ] Generazione contratto PDF
- [ ] Integrazione firma digitale (Signaturit)
- [ ] Sigillo Incasòl (codice 6 cifre obbligatorio)
- [ ] GDPR data retention (auto-delete 90gg)

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
5. **RLS policy** sulla tabella `users`: non fare subquery ricorsive su `users` stessa
6. **Il file** `proxy.ts` sostituisce `middleware.ts` in Next.js 16
7. **Trigger** `handle_new_user()` crea automaticamente un record in `candidates` — gli agenti vanno inseriti manualmente in `users`

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

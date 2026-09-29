-- Schema iniziale Safety House.
--
-- Perché questo file esiste solo ora: le 6 tabelle di base erano state create
-- a mano dal pannello Supabase, quindi quando il progetto è stato cancellato
-- per inattività non c'era modo di ricrearle. Questo file le ricostruisce
-- partendo dalle query realmente presenti nel codice (pagine, API route e
-- scripts/seed-demo.ts): da qui in avanti lo schema vive nel repo.
--
-- Non include candidates.document_status: quello lo aggiunge 002, che va
-- eseguita subito dopo. Idempotente: rieseguibile senza errori.

-- ---------------------------------------------------------------------------
-- Tabelle
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agencies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  plan       text        NOT NULL DEFAULT 'starter'
                         CHECK (plan IN ('starter', 'pro', 'enterprise')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Filiali: ancora non usata dall'interfaccia, prevista dallo Sprint 5
-- (multi-filiale). La ricreo per non perdere il riferimento in users.branch_id.
CREATE TABLE IF NOT EXISTS branches (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  city       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agenti e direttori. Tenuta separata da candidates: la stessa persona non
-- può essere entrambe le cose, e il trigger sui nuovi iscritti popola solo
-- candidates (vedi in fondo).
CREATE TABLE IF NOT EXISTS users (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id  uuid        REFERENCES agencies(id) ON DELETE CASCADE,
  branch_id  uuid        REFERENCES branches(id) ON DELETE SET NULL,
  role       text        NOT NULL DEFAULT 'agent'
                         CHECK (role IN ('agency_director', 'branch_director', 'agent')),
  full_name  text,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id                    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             text,
  email                 text,
  phone                 text,
  dni_nie               text,
  nationality           text,
  employment_type       text        CHECK (employment_type IN ('employed', 'self_employed', 'student', 'retired')),
  contract_type         text        CHECK (contract_type IN ('indefinido', 'temporal', 'autonomo')),
  monthly_income        numeric(10,2),
  has_pets              boolean     NOT NULL DEFAULT false,
  smoker                boolean     NOT NULL DEFAULT false,
  num_occupants         integer     NOT NULL DEFAULT 1,
  extra_notes           text,
  vida_laboral_csv_code text,
  safety_score          numeric(4,2),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id          uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id           uuid        REFERENCES users(id) ON DELETE SET NULL,
  title              text        NOT NULL,
  address            text,
  city               text,
  monthly_rent       numeric(10,2) NOT NULL,
  rooms              integer,
  status             text        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'paused', 'closed')),
  -- Requisiti del proprietario: no_pets, no_smokers, max_occupants,
  -- min_income_ratio. JSON perché sono opzionali e crescono nel tempo senza
  -- richiedere una migrazione per ogni nuovo requisito.
  owner_requirements jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Token del link pubblico di candidatura (/apply/[token]).
  public_link_token  uuid        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid        NOT NULL REFERENCES listings(id)   ON DELETE CASCADE,
  candidate_id uuid        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending',
  safety_score numeric(4,2),
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Serve all'upsert del seed (onConflict) e fa sì che una seconda
  -- candidatura allo stesso annuncio venga rifiutata con il codice 23505,
  -- che /apply/complete gestisce già come "già candidato".
  CONSTRAINT applications_listing_candidate_unique UNIQUE (listing_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS procedures (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id         uuid        REFERENCES listings(id)   ON DELETE CASCADE,
  candidate_id       uuid        REFERENCES candidates(id) ON DELETE CASCADE,
  agency_id          uuid        REFERENCES agencies(id)   ON DELETE CASCADE,
  status             text        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'completed')),
  step_current       integer     NOT NULL DEFAULT 1,
  incasol_code       text,
  archive_expires_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Indici sulle colonne usate come filtro in ogni pagina dell'elenco.
CREATE INDEX IF NOT EXISTS listings_agency_idx      ON listings(agency_id);
CREATE INDEX IF NOT EXISTS applications_listing_idx ON applications(listing_id);
CREATE INDEX IF NOT EXISTS procedures_agency_idx    ON procedures(agency_id);

-- ---------------------------------------------------------------------------
-- Funzione ponte: l'agenzia dell'utente collegato
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER apposta: legge "users" scavalcando le sue policy. Senza
-- questo, una policy su users che interroga users stessa entra in ricorsione
-- infinita e Postgres blocca ogni query (era il problema annotato in
-- PROJECT.md). Tutte le policy sotto passano da qui.

CREATE OR REPLACE FUNCTION public.agenzia_utente_corrente()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.users WHERE id = auth.uid();
$$;

-- Un candidato è visibile all'agenzia se si è candidato a un suo annuncio.
-- SECURITY DEFINER per lo stesso motivo: evita che valutare la policy su
-- candidates faccia scattare a cascata quelle di applications e listings.
CREATE OR REPLACE FUNCTION public.candidato_visibile_ad_agenzia(candidato uuid, agenzia uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.listings l ON l.id = a.listing_id
    WHERE a.candidate_id = candidato AND l.agency_id = agenzia
  ) OR EXISTS (
    SELECT 1 FROM public.procedures p
    WHERE p.candidate_id = candidato AND p.agency_id = agenzia
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Attivata su tutte le tabelle: senza policy nessuno legge niente. Le API
-- route che devono scavalcarle (il calcolo dello score) usano già il client
-- admin in lib/supabase/admin.ts.

ALTER TABLE agencies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures   ENABLE ROW LEVEL SECURITY;

-- users: ognuno vede solo la propria riga (mai una subquery su users qui).
DROP POLICY IF EXISTS users_propria_riga ON users;
CREATE POLICY users_propria_riga ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- agencies: la propria agenzia, in lettura (serve al nome in Impostazioni).
DROP POLICY IF EXISTS agencies_propria ON agencies;
CREATE POLICY agencies_propria ON agencies
  FOR SELECT TO authenticated
  USING (id = public.agenzia_utente_corrente());

DROP POLICY IF EXISTS branches_propria_agenzia ON branches;
CREATE POLICY branches_propria_agenzia ON branches
  FOR SELECT TO authenticated
  USING (agency_id = public.agenzia_utente_corrente());

-- listings: l'agenzia gestisce i propri annunci (lettura e scrittura).
DROP POLICY IF EXISTS listings_agenzia ON listings;
CREATE POLICY listings_agenzia ON listings
  FOR ALL TO authenticated
  USING (agency_id = public.agenzia_utente_corrente())
  WITH CHECK (agency_id = public.agenzia_utente_corrente());

-- listings, accesso pubblico: /apply/[token] mostra l'annuncio a chi non ha
-- ancora un account, quindi la lettura anonima è necessaria. Limitata agli
-- annunci attivi. Da restringere al singolo token quando serve (vedi nota
-- in PROJECT.md).
DROP POLICY IF EXISTS listings_lettura_pubblica ON listings;
CREATE POLICY listings_lettura_pubblica ON listings
  FOR SELECT TO anon
  USING (status = 'active');

-- candidates: il candidato gestisce il proprio profilo; l'agenzia legge
-- quelli che si sono candidati ai suoi annunci.
DROP POLICY IF EXISTS candidates_proprio_profilo ON candidates;
CREATE POLICY candidates_proprio_profilo ON candidates
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS candidates_lettura_agenzia ON candidates;
CREATE POLICY candidates_lettura_agenzia ON candidates
  FOR SELECT TO authenticated
  USING (public.candidato_visibile_ad_agenzia(id, public.agenzia_utente_corrente()));

-- applications: il candidato crea e vede le proprie; l'agenzia vede quelle
-- sui propri annunci.
DROP POLICY IF EXISTS applications_candidato ON applications;
CREATE POLICY applications_candidato ON applications
  FOR ALL TO authenticated
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS applications_agenzia ON applications;
CREATE POLICY applications_agenzia ON applications
  FOR ALL TO authenticated
  USING (listing_id IN (
    SELECT id FROM listings WHERE agency_id = public.agenzia_utente_corrente()
  ))
  WITH CHECK (listing_id IN (
    SELECT id FROM listings WHERE agency_id = public.agenzia_utente_corrente()
  ));

DROP POLICY IF EXISTS procedures_agenzia ON procedures;
CREATE POLICY procedures_agenzia ON procedures
  FOR ALL TO authenticated
  USING (agency_id = public.agenzia_utente_corrente())
  WITH CHECK (agency_id = public.agenzia_utente_corrente());

-- ---------------------------------------------------------------------------
-- Nuovi iscritti → riga in candidates
-- ---------------------------------------------------------------------------
-- Chi si registra dal link pubblico è sempre un candidato: la riga va creata
-- qui perché /apply/complete subito dopo fa una UPDATE, non una INSERT.
-- Gli agenti vanno inseriti a mano in "users".

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidates (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

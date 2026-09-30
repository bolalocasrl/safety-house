-- Foto degli annunci.
--
-- Attiva lo spazio di archiviazione di Supabase, che nel progetto non era mai
-- stato usato, e aggiunge agli annunci l'elenco delle loro foto.
--
-- Le foto sono pubbliche di proposito: la pagina di candidatura le mostra a
-- chi non ha ancora un account. Caricarle e cancellarle invece può farlo solo
-- l'agenzia proprietaria dell'annuncio.
--
-- Nota per quando toccherà ai documenti: quelli andranno in un contenitore
-- separato e NON pubblico. Le foto di un appartamento e la busta paga di un
-- inquilino non possono stare sotto le stesse regole.
--
-- Idempotente: rieseguibile senza errori.

-- ---------------------------------------------------------------------------
-- 1. L'elenco delle foto sull'annuncio
-- ---------------------------------------------------------------------------
-- Un elenco ordinato di percorsi dentro il contenitore, non una tabella a
-- parte: servono solo il percorso e l'ordine, e l'ordine è quello dell'elenco.
-- La prima foto fa da copertina.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS foto jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Il contenitore delle foto
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('annunci', 'annunci', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ---------------------------------------------------------------------------
-- 3. Chi può fare cosa
-- ---------------------------------------------------------------------------
-- I file stanno in cartelle intitolate all'annuncio: <id annuncio>/<file>.
-- Da lì si risale all'agenzia, e si concede la scrittura solo alla sua.

DROP POLICY IF EXISTS annunci_lettura_pubblica ON storage.objects;
CREATE POLICY annunci_lettura_pubblica ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'annunci');

DROP POLICY IF EXISTS annunci_caricamento_agenzia ON storage.objects;
CREATE POLICY annunci_caricamento_agenzia ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'annunci'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.listings
      WHERE agency_id = public.agenzia_utente_corrente()
    )
  );

DROP POLICY IF EXISTS annunci_eliminazione_agenzia ON storage.objects;
CREATE POLICY annunci_eliminazione_agenzia ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'annunci'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.listings
      WHERE agency_id = public.agenzia_utente_corrente()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Le foto arrivano anche alla pagina pubblica di candidatura
-- ---------------------------------------------------------------------------
-- Stessa funzione della migrazione 003, con in più l'elenco delle foto.
--
-- Va eliminata e riscritta, non sostituita: Postgres non permette di cambiare
-- il tipo restituito da una funzione esistente. L'intero file gira dentro una
-- sola transazione, quindi la funzione non risulta mai mancante a metà strada
-- e la pagina pubblica non resta scoperta nemmeno per un istante.

DROP FUNCTION IF EXISTS public.annuncio_pubblico(uuid);

CREATE FUNCTION public.annuncio_pubblico(token uuid)
RETURNS TABLE (
  id           uuid,
  title        text,
  address      text,
  city         text,
  monthly_rent numeric,
  rooms        integer,
  foto         jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.title, l.address, l.city, l.monthly_rent, l.rooms, l.foto
  FROM public.listings l
  WHERE l.public_link_token = token
    AND l.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.annuncio_pubblico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annuncio_pubblico(uuid) TO anon, authenticated;

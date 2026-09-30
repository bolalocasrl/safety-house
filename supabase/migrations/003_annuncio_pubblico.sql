-- Restringe la lettura pubblica degli annunci.
--
-- Prima: la policy "listings_lettura_pubblica" lasciava leggere a chiunque
-- TUTTI gli annunci attivi, con ogni colonna — compresi public_link_token e
-- agency_id. Bastava la chiave pubblica, quella che viaggia nel browser di
-- qualsiasi visitatore, per scaricare l'elenco completo degli immobili di
-- un'agenzia e i link di candidatura di ciascuno.
--
-- Serviva solo alla pagina /apply/[token], che di un annuncio mostra sei
-- campi. Quindi al posto della lettura libera c'è una funzione che, dato il
-- token, restituisce quel singolo annuncio e nient'altro: senza il token non
-- si ottiene niente, e il token stesso non è più ricavabile.
--
-- Effetto collaterale positivo: la vecchia policy valeva solo per i visitatori
-- anonimi, quindi un candidato già registrato che riapriva il proprio link di
-- candidatura si vedeva rispondere "annuncio non trovato". La funzione è
-- concessa anche a chi ha fatto l'accesso, e il caso si risolve.
--
-- Idempotente: rieseguibile senza errori.

CREATE OR REPLACE FUNCTION public.annuncio_pubblico(token uuid)
RETURNS TABLE (
  id           uuid,
  title        text,
  address      text,
  city         text,
  monthly_rent numeric,
  rooms        integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.title, l.address, l.city, l.monthly_rent, l.rooms
  FROM public.listings l
  WHERE l.public_link_token = token
    AND l.status = 'active';
$$;

-- La funzione gira coi permessi di chi l'ha creata (SECURITY DEFINER): va
-- concessa esplicitamente, non lasciata aperta a chiunque per default.
REVOKE ALL ON FUNCTION public.annuncio_pubblico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annuncio_pubblico(uuid) TO anon, authenticated;

-- Tolta la lettura libera: da qui in poi l'unica via pubblica è la funzione.
DROP POLICY IF EXISTS listings_lettura_pubblica ON listings;

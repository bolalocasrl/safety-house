-- Tetto al peso delle foto.
--
-- Il ridimensionamento prima del caricamento sta nel browser, e il browser è
-- l'unico posto dove non ci si può fidare: basta una richiesta costruita a
-- mano per scavalcarlo. Il limite va messo anche qui, dove nessuno può
-- aggirarlo.
--
-- 2 MB per file: il ridimensionamento ne produce sotto mezzo, quindi il tetto
-- non si raggiunge mai lavorando normalmente. Serve solo a impedire che un
-- singolo caricamento anomalo si mangi una fetta del gigabyte compreso nel
-- piano gratuito.
--
-- Limitati anche i formati accettati: un contenitore pubblico che accetta
-- qualsiasi tipo di file è un invito a usarlo per ospitare altro.
--
-- Idempotente: rieseguibile senza errori.

UPDATE storage.buckets
SET file_size_limit = 2097152,  -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'annunci';

-- Fase 2: esito reale della verifica documentale del candidato.
-- Guida la componente antifrode di calculateScore() (lib/scoring/algorithm.ts).
--
-- Idempotente: eseguibile più volte senza errori.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS document_status text NOT NULL DEFAULT 'verified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidates_document_status_check'
  ) THEN
    ALTER TABLE candidates
      ADD CONSTRAINT candidates_document_status_check
      CHECK (document_status IN ('verified', 'suspicious', 'fraudulent'));
  END IF;
END $$;

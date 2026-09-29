/**
 * Riconosce il limite di invio del servizio email.
 *
 * Quando Supabase supera la quota di email consentite risponde 429 con
 * `over_email_send_rate_limit`. Non è un errore dell'utente: l'indirizzo è
 * giusto, è il servizio che si rifiuta di spedire. Va distinto, perché dirgli
 * "controlla l'indirizzo" lo manda a cercare un errore di battitura che non
 * esiste — e dopo due tentativi falliti se ne va convinto che il sito sia
 * rotto.
 *
 * Sta qui e non dentro le pagine perché login e candidatura devono trattare
 * il caso allo stesso modo: due copie della stessa condizione prima o poi
 * divergono.
 */
export function eLimiteInvioEmail(errore: { status?: number; code?: string } | null | undefined): boolean {
  if (!errore) return false
  return errore.status === 429 || (errore.code ?? '').includes('rate_limit')
}

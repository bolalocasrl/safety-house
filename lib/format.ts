const INTL_LOCALE: Record<string, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
  it: 'it-IT',
  en: 'en-GB',
}

function resolveLocale(locale: string) {
  return INTL_LOCALE[locale] ?? 'es-ES'
}

export function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, locale: string) {
  return new Intl.DateTimeFormat(resolveLocale(locale)).format(new Date(date))
}

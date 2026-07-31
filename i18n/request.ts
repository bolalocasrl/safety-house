import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['es', 'ca', 'it', 'en'] as const
export type AppLocale = typeof locales[number]
export const defaultLocale: AppLocale = 'es'
export const LOCALE_COOKIE = 'sh_lang'

function isLocale(value: string | undefined): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const stored = cookieStore.get(LOCALE_COOKIE)?.value
  const locale: AppLocale = isLocale(stored) ? stored : defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ptBR from './locales/pt-BR.json'
import es from './locales/es.json'
import it from './locales/it.json'
import ja from './locales/ja.json'
import de from './locales/de.json'

const resources = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
  es: { translation: es },
  it: { translation: it },
  ja: { translation: ja },
  de: { translation: de },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

const SUPPORTED_LANGS = ['en', 'de', 'es', 'it', 'ja', 'pt'] as const

export function osLocaleToLang(locale: string): string {
  const lang = locale.split('-')[0].toLowerCase()
  const full = locale.toLowerCase().replace('_', '-')
  if (full === 'pt-br') return 'pt-BR'
  if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) return lang
  return 'en'
}

export function settingValueToLangCode(value: string): string {
  if (value === 'pt_BR') return 'pt-BR'
  return value
}

export async function resolveAndApplyLanguage(langPref: string): Promise<void> {
  if (langPref === 'auto') {
    try {
      const locale = await window.electronAPI?.app?.getLocale()
      if (locale) {
        i18n.changeLanguage(osLocaleToLang(locale))
        return
      }
    } catch {}
    i18n.changeLanguage('en')
    return
  }
  i18n.changeLanguage(settingValueToLangCode(langPref))
}

export default i18n
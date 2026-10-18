import { registerDecorator, type ValidationOptions } from 'class-validator'

/**
 * The site's other languages. Korean lives in the record's own columns and is
 * always there; these are its translations, each optional — a field left
 * untranslated falls back to the Korean on the site.
 */
const TRANSLATION_LANGUAGES = ['en', 'ru', 'ky'] as const
export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number]

/** `{ en: { title: '…' }, ru: { … }, ky: { … } }` — only the translated fields. */
export type Translations<Field extends string = string> = Partial<Record<TranslationLanguage, Partial<Record<Field, string>>>>

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validates a `translations` object: only the site's languages, only the
 * given fields, each a string no longer than its Korean column allows.
 */
export function IsTranslations(fields: Record<string, number>, options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isTranslations',
      target: target.constructor,
      propertyName,
      options: { message: 'validation.translations.invalid', ...options },
      validator: {
        validate(value: unknown) {
          if (!isPlainObject(value)) return false

          return Object.entries(value).every(
            ([language, texts]) =>
              (TRANSLATION_LANGUAGES as readonly string[]).includes(language) &&
              isPlainObject(texts) &&
              Object.entries(texts).every(([field, text]) => field in fields && typeof text === 'string' && text.length <= fields[field]),
          )
        },
      },
    })
}

/**
 * Trimmed, with empty texts and empty languages dropped, so "not translated"
 * is always simply absent. `rich` fields go through `sanitize` (HTML).
 */
export function cleanTranslations(value: Translations | undefined, sanitize?: { fields: string[]; fn: (html: string) => string }): Translations {
  const clean: Translations = {}

  for (const language of TRANSLATION_LANGUAGES) {
    const texts = value?.[language]
    if (!texts) continue
    const kept: Record<string, string> = {}

    for (const [field, text] of Object.entries(texts)) {
      let result = (text ?? '').trim()
      if (result && sanitize?.fields.includes(field)) result = sanitize.fn(result)
      // An editor's empty paragraph is no translation.
      if (result && result.replace(/<[^>]*>|&nbsp;|\s/g, '')) kept[field] = result
    }

    if (Object.keys(kept).length > 0) clean[language] = kept
  }

  return clean
}

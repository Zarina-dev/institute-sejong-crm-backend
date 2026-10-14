/**
 * What an edit changed, in a form a person reads at a glance: for each field
 * that was sent and came out different, its value before and after —
 * shortened, with HTML read as plain text. Lists are counted (사진 3 → 5),
 * translations say which languages and fields moved, and anything else
 * structured only says that it changed.
 */
export type AuditChange = {
  field: string
  /** text: a short value; count: a list's length; translations: "en:title,summary;ru:title"; changed: no value shown. */
  kind: 'text' | 'count' | 'bool' | 'translations' | 'changed'
  from?: string | null
  to?: string | null
}

/** Longest value kept, in characters — enough to recognise, short enough for a tooltip. */
const MAX = 80

const plain = (text: string) =>
  text
    .replace(/<\s*(br|\/p|\/li|\/h\d)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const shorten = (text: string) => (text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text)

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** "en:title,summary;ru:title" — which languages had which fields changed. */
function translationChanges(before: unknown, after: unknown) {
  const a = isObject(before) ? before : {}
  const b = isObject(after) ? after : {}
  const parts: string[] = []
  for (const language of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = isObject(a[language]) ? a[language] : {}
    const y = isObject(b[language]) ? b[language] : {}
    const fields = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(
      (field) => JSON.stringify(x[field] ?? '') !== JSON.stringify(y[field] ?? ''),
    )
    if (fields.length) parts.push(`${language}:${fields.join(',')}`)
  }
  return parts.join(';')
}

export function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null, fields: string[]): AuditChange[] {
  if (!before || !after) return fields.map((field) => ({ field, kind: 'changed' as const }))
  const changes: AuditChange[] = []

  for (const field of [...new Set(fields)]) {
    const from = before[field]
    const to = after[field]
    if (JSON.stringify(from ?? null) === JSON.stringify(to ?? null)) continue

    if (field === 'translations') {
      const moved = translationChanges(from, to)
      if (moved) changes.push({ field, kind: 'translations', to: moved })
    } else if (Array.isArray(from) || Array.isArray(to)) {
      changes.push({ field, kind: 'count', from: String(Array.isArray(from) ? from.length : 0), to: String(Array.isArray(to) ? to.length : 0) })
    } else if (typeof from === 'boolean' || typeof to === 'boolean') {
      changes.push({ field, kind: 'bool', from: from == null ? null : String(from), to: to == null ? null : String(to) })
    } else if (isObject(from) || isObject(to)) {
      changes.push({ field, kind: 'changed' })
    } else {
      const a = from == null ? '' : shorten(plain(String(from)))
      const b = to == null ? '' : shorten(plain(String(to)))
      // Only markup moved (a bold word, a line break): say it changed, without two identical texts.
      changes.push(a === b ? { field, kind: 'changed' } : { field, kind: 'text', from: a || null, to: b || null })
    }
  }

  return changes
}

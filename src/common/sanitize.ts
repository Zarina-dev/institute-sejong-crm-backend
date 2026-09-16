import sanitizeHtml from 'sanitize-html'

/**
 * Server-side allow-list for rich text stored from the admin editor.
 * The client sanitizes again at render time (DOMPurify); this is the layer
 * that guarantees nothing dangerous ever reaches the database.
 *
 * Kept in step with the editor's feature set: headings, inline marks, lists,
 * links, images, alignment (via style/class) and font size (inline style).
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 's', 'span', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'figure', 'figcaption', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'class', 'data-align', 'data-size'],
      '*': ['style', 'class'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|center|right|justify)$/],
        'font-size': [/^\d{1,2}(\.\d+)?(px|rem|em)$/],
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/],
      },
    },
    allowedClasses: { img: ['align-left', 'align-center', 'align-right', 'size-small', 'size-medium', 'size-full'], '*': [] },
    // Only same-origin uploads or https images; no data: URIs (they bloat rows and dodge the upload filter).
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === 'img' && !/^(\/uploads\/images\/|https?:\/\/)/.test(frame.attribs.src ?? ''),
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  })
}

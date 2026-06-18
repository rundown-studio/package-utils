import sanitizeHtml from 'sanitize-html'

/**
 * Cell rich-text wire helpers for /api/v1 (api-v1-must-have §2).
 *
 * Cells STORE TipTap-flavored HTML — standard StarterKit tags plus text color
 * (`<span style="color">`), highlight (`<mark>`), task-list markup
 * (TaskList/TaskItem wrappers: `<label>`, `<input type="checkbox">`, `<div>`),
 * and four non-standard nodes whose legacy storage tags are `<custom-mention>`, `<variable>`,
 * `<img-component>`, `<file-component>`. The public API does NOT expose those
 * legacy names: it speaks a stable, namespaced vocabulary instead (see
 * `PUBLIC_TO_INTERNAL_TAGS`). The four helpers here are the seam between the two
 * vocabularies plus the untrusted-input sanitizer:
 *
 *   - `sanitizeCellHtml` — the `content_html` WRITE ingress. Sanitizes untrusted
 *     input against an allowlist AND adapts the public tag vocabulary down to the
 *     legacy storage names in one pass. The write path is an UNTRUSTED ingress
 *     whose output is shipped to an external renderer (api.pdfendpoint.com)
 *     during PDF export, so we cannot store raw HTML. Allowlist, not denylist:
 *     denylisting XSS vectors leaks (open-ended `on*` handlers,
 *     `javascript:`/`url()` values, encoding bypasses). Fails closed — an
 *     unknown tag/attr is dropped, not passed.
 *   - `toPublicCellHtml` — the READ projection. Renames the legacy storage tags
 *     up to the public vocabulary. Run on already-trusted stored content.
 *   - `plainTextToHtml` — escape + `<p>`-wrap for the `content` WRITE path, so a
 *     plaintext write produces well-formed `content_html` on the next read.
 *   - `fromPublicCellContent` — the single write touchpoint that turns API input
 *     into storage shape.
 *
 * The adapter exists so the public wire vocabulary can ship NOW while the
 * internal node rename + Firestore migration land later, independently (the two
 * PRs are deliberately not coupled). Once storage is migrated to match the wire,
 * `PUBLIC_TO_INTERNAL_TAGS` collapses to identity and this adapter can be
 * deleted.
 *
 * The allowlist mirrors the TipTap extension set in
 * `client/src/components/tiptap/get-tip-tap-extensions.ts`. Keep them in sync;
 * a new extension's tag/attr is silently stripped until added here (fail-safe,
 * caught by the fidelity test).
 */

/**
 * The public ⇄ internal cell-tag contract — the api-v1 adapter's single source
 * of truth. Keys are the public wire tags; values are the legacy storage tags.
 *
 *   public        storage
 *   ------------  --------------
 *   rs-mention  → custom-mention
 *   rs-variable → variable
 *   rs-file     → file-component
 *   img         → img-component   (a public image IS a standard HTML <img>;
 *                                  only this one drops the `rs-` prefix)
 *
 * `rs-*` is a valid HTML custom-element namespace (hyphenated, lowercase), so the
 * tags are safe from current/future single-word tag reservations and won't
 * collide with built-in TipTap node names the way bare `image`/`mention` would.
 */
export const PUBLIC_TO_INTERNAL_TAGS = {
  'rs-mention': 'custom-mention',
  'rs-variable': 'variable',
  'rs-file': 'file-component',
  img: 'img-component',
} as const

const INTERNAL_TO_PUBLIC_TAGS: Record<string, string> = Object.fromEntries(
  Object.entries(PUBLIC_TO_INTERNAL_TAGS).map(([pub, internal]) => [internal, pub]),
)

// Color values TipTap emits: `rgb(...)` / `rgba(...)`, hex, and bare keywords
// (`inherit`, `currentColor`, named colors). `url(...)` and `expression(...)`
// fail all three patterns (parens + non-numeric content) → the declaration is
// dropped, killing the `style`-based exfil/SSRF vector.
const COLOR_VALUE = [/^#(0x)?[0-9a-fA-F]+$/, /^rgba?\(\s*[\d.\s,%]+\)$/, /^[a-zA-Z]+$/]

const ALLOWED_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    color: COLOR_VALUE,
    'background-color': COLOR_VALUE,
  },
}

// StarterKit + text color (`<span>`) + highlight (`<mark>`) + taskList markup
// (`<label>`, `<input type="checkbox">`, `<div>` — the TaskItem wrappers the
// dashboard editor serializes). Shared by both directions so the read and write
// allowlists can never drift on the standard tags — only the custom-node tags
// differ (storage names vs public names).
const BASE_TAGS = [
  'p',
  'strong',
  'em',
  's',
  'a',
  'code',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'hr',
  'span',
  'mark',
  'label',
  'input',
  'div',
]

// Shared by both directions like BASE_TAGS. `data-*` (mention/variable/taskList
// payloads), `class` (Highlight's Tailwind classes — inert, kept for fidelity),
// `style` (color/highlight; filtered by allowedStyles). `input` carries only the
// checkbox state TaskItem serializes — no `name`/`value`, so it stays inert.
const BASE_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'style', 'data-*'],
  a: ['href', 'target', 'rel'],
  input: ['type', 'checked'],
}

/**
 * WRITE config (untrusted `content_html` → stored HTML). `transformTags` renames
 * the public vocabulary down to the legacy storage tags; `allowedTags` therefore
 * lists the STORAGE names (a transformed tag must itself be allowed or it would
 * be stripped). `<img>` → `<img-component>` (paired) is handled by the rename;
 * `img`/`rs-*` need not be in `allowedTags` — only the transform OUTPUT does.
 *
 * The single source of truth for the cell-HTML allowlist. Exported so tests and
 * future consumers reference the same config (never a divergent copy).
 */
export const CELL_HTML_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...BASE_TAGS,
    // custom interactive nodes — STORAGE names (rename targets)
    'custom-mention',
    'variable',
    'img-component',
    'file-component',
  ],
  allowedAttributes: {
    ...BASE_ATTRIBUTES,
    'img-component': ['src'],
    'file-component': ['filename', 'url'],
  },
  allowedStyles: ALLOWED_STYLES,
  transformTags: PUBLIC_TO_INTERNAL_TAGS,
  // No semantic validation of values/IDs — a `data-mention-id` may point
  // nowhere (renders the fallback, same as the dashboard); URLs are not
  // fetched. That is the consumer's problem, not ours.
}

/**
 * READ config (stored HTML → public `content_html`). `transformTags` renames the
 * legacy storage tags up to the public vocabulary; `allowedTags` lists the
 * PUBLIC names (the transform output). Symmetric with the write allowlist on the
 * standard tags (shared `BASE_TAGS`) so a tag the write path accepts is never
 * dropped on the way back out.
 */
const CELL_HTML_TO_PUBLIC_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...BASE_TAGS,
    // custom interactive nodes — PUBLIC names (rename targets)
    'rs-mention',
    'rs-variable',
    'rs-file',
    'img',
  ],
  allowedAttributes: {
    ...BASE_ATTRIBUTES,
    img: ['src'],
    'rs-file': ['filename', 'url'],
  },
  allowedStyles: ALLOWED_STYLES,
  transformTags: INTERNAL_TO_PUBLIC_TAGS,
}

/**
 * Sanitize untrusted `content_html` and adapt the public tag vocabulary to the
 * legacy storage tags, in one pass. Allowlist-based, idempotent
 * (`sanitize(sanitize(x)) === sanitize(x)` — the storage tags pass through
 * unchanged on a second run), and lenient: disallowed tags/attrs are stripped,
 * not rejected — matching how TipTap drops unknown nodes on load.
 *
 * Output is NOT byte-identical to the input: `sanitize-html` runs with entity
 * decoding on, so `&nbsp;` becomes U+00A0 and `style` whitespace/attribute order
 * normalize. The result is semantically equivalent and stable on re-sanitize.
 *
 * Accepted tradeoff: because the storage tags are allowed (they are the rename
 * targets), a consumer that sends a legacy tag directly is tolerated rather than
 * rejected. The public contract documents only the `rs-*`/`img` vocabulary; the
 * read projection always normalizes back to it, so the leniency is invisible.
 */
export function sanitizeCellHtml(html: string): string {
  return sanitizeHtml(html, CELL_HTML_SANITIZE_OPTIONS)
}

/**
 * Project stored cell HTML to the public `content_html`: rename the legacy
 * storage tags up to the public vocabulary (`<custom-mention>` → `<rs-mention>`,
 * `<img-component>` → `<img>`, …). Stored content is already trusted (written via
 * the dashboard editor or `sanitizeCellHtml`); re-running the allowlist here is a
 * no-op on valid content and a cheap defense-in-depth on the PDF-renderer egress.
 */
export function toPublicCellHtml(html: string): string {
  return sanitizeHtml(html, CELL_HTML_TO_PUBLIC_OPTIONS)
}

/**
 * Convert a plaintext `content` write into well-formed cell HTML: HTML-escape,
 * convert newlines to `<br>`, and wrap in a single `<p>`. Replaces (does not
 * merge with) any existing rich content — mapping flat text onto an existing
 * structure is intractable, so a `content` write is a clean overwrite. Empty
 * string stays empty (a legitimate cleared-but-present cell, not a delete).
 */
export function plainTextToHtml(text: string): string {
  if (text === '') return ''
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  return `<p>${escaped}</p>`
}

/**
 * Resolve a cell write into the stored `{ text }` content. The schema layer
 * guarantees exactly one of `content` / `content_html` is present;
 * `content_html` wins if (defensively) both arrive. The single touchpoint that
 * turns API input into storage shape — replaces the old `valueToContent`.
 */
export function fromPublicCellContent(input: { content?: string; content_html?: string }): { text: string } {
  if (typeof input.content_html === 'string') return { text: sanitizeCellHtml(input.content_html) }
  return { text: plainTextToHtml(input.content ?? '') }
}

import { convert } from 'html-to-text'

const BLOCK = { leadingLineBreaks: 1, trailingLineBreaks: 1 } as const

/**
 * Flatten a cell's TipTap rich-text HTML (its `content.text`) to readable plain
 * text — the cell's plaintext `content` / `value` projection.
 *
 * Single source of truth shared by the v0 + v1 external APIs (the cell `value` /
 * `content` field), the realtime fat `cell` SSE body, AND the CSV export — one
 * converter so the same cell flattens identically everywhere.
 *
 * Mentions and text-variables render from the **display string embedded in the
 * HTML at write time** (`data-fallback-name` / `data-fallback-value`) — NOT
 * resolved against the live mentions/variables. That keeps this a pure function
 * of the HTML alone: no cross-collection reads, no per-read drift, and the SSE
 * push + REST + export all flatten a cell identically from the doc. The plaintext
 * is what the cell looked like when last edited; the lossless `content_html`
 * still carries the live mention-id/variable-key for round-tripping, and a
 * rename / value-change re-bakes into the fallback the next time the cell is
 * edited.
 *
 * Dual vocabulary: each custom node matches BOTH its legacy storage tag and its
 * `rs-*` successor, so the planned system-wide cell-tag rename can land without
 * changing this flatten — a cell written before or after the migration (or a
 * mid-migration mix) projects identically.
 *
 * Conventions:
 *   - mentions  → `@name`  (`custom-mention`/`rs-mention`, `data-fallback-name`)
 *   - variables → `$value` (`variable`/`rs-variable`, `data-fallback-value`)
 *   - links     → `text [href]` (`<a>`, html-to-text's default anchor form)
 *   - files     → `filename [url]` (`file-component`/`rs-file`) — same form as links
 *   - images    → `![image](src)` (`img-component`/`img`) — markdown
 *     (everything else is plain text)
 *   - one line per block; a single blank line for an empty paragraph or around
 *     an image; runs of 3+ line breaks collapse to one blank line; no word-wrap;
 *     headings are NOT upper-cased.
 *
 * Bold / italic / highlight / color collapse to their text. Output is trimmed.
 */
export function cellHtmlToPlainText(html: string | null): string {
  if (!html) return ''
  const text = convert(html, {
    wordwrap: false,
    formatters: {
      // Mentions render inline (`@name`) — never wrap them in a block, or every
      // mention forces line breaks mid-sentence and trims the surrounding spaces.
      mentionInline: (element, _walk, builder) => {
        const fallback = element.attribs['data-fallback-name']
        builder.addInline(`@${fallback || ''}`)
      },
      // Text variables render inline (`$value`).
      textVariableInline: (element, _walk, builder) => {
        const fallback = element.attribs['data-fallback-value']
        builder.addInline(`$${fallback || ''}`)
      },
      // Images become a markdown link on their own line so the URL isn't lost.
      imageMarkdown: (element, _walk, builder) => {
        const src = element.attribs.src
        if (!src) return
        builder.openBlock({ leadingLineBreaks: 2 })
        builder.addInline(`![image](${src})`)
        builder.closeBlock({ trailingLineBreaks: 2 })
      },
      // Files render inline as `filename [url]` — the same `text [href]` form
      // html-to-text gives anchors, so a file attachment and a link read alike.
      // Inline — composes with the surrounding block; a standalone file in its
      // own `<p>` still gets its own line.
      fileLink: (element, _walk, builder) => {
        const url = element.attribs.url
        if (!url) return
        builder.addInline(`${element.attribs.filename || 'file'} [${url}]`)
      },
    },
    selectors: [
      { selector: 'custom-mention', format: 'mentionInline' },
      { selector: 'rs-mention', format: 'mentionInline' },
      { selector: 'variable', format: 'textVariableInline' },
      { selector: 'rs-variable', format: 'textVariableInline' },
      { selector: 'img-component', format: 'imageMarkdown' },
      { selector: 'img', format: 'imageMarkdown' },
      { selector: 'file-component', format: 'fileLink' },
      { selector: 'rs-file', format: 'fileLink' },
      { selector: 'p', options: BLOCK },
      { selector: 'h1', options: { ...BLOCK, uppercase: false } },
      { selector: 'h2', options: { ...BLOCK, uppercase: false } },
      { selector: 'h3', options: { ...BLOCK, uppercase: false } },
      { selector: 'h4', options: { ...BLOCK, uppercase: false } },
      { selector: 'h5', options: { ...BLOCK, uppercase: false } },
      { selector: 'h6', options: { ...BLOCK, uppercase: false } },
      { selector: 'ul', options: BLOCK },
      { selector: 'ol', options: BLOCK },
    ],
  })
  // Normalize any Unicode space separator (e.g. the `&nbsp;` U+00A0 TipTap inserts
  // after inline atoms like mentions) to a regular space — `\p{Zs}` deliberately
  // excludes newlines, so the one-line-per-block layout is preserved. Then collapse
  // runs of 3+ line breaks (an image beside an empty paragraph, stacked empty
  // paragraphs) down to a single blank line.
  return text
    .replace(/\p{Zs}/gu, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

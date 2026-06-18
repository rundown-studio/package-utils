import { describe, expect, it } from 'vitest'
import { cellHtmlToPlainText } from '../cellHtmlToPlainText'

// A real production cell: span color, two mentions + two variables, bold, a
// mark, two empty paragraphs, an image, a heading, and an ordered list.
const FIXTURE =
  '<p>This one is by<span style="color: rgb(255, 255, 255);"> </span><custom-mention data-mention-id="RH0Ao1j2pZu4DhccM4N3" data-fallback-name="Marty McFly"></custom-mention>&nbsp;and the crew of the <variable data-variable-key="venue" data-fallback-value="Flying Circus"></variable>.</p><p>Let\'s give an applause for their <strong>wonderful</strong> new vehicle, the <variable data-variable-key="mount" data-fallback-value="DeLorean DMC-5"></variable>&nbsp;👏👏👏</p><p></p><p><custom-mention data-mention-id="wJWGny1OZ3cqQjvp8g0a" data-fallback-name="CAM-A"></custom-mention>&nbsp;<mark class="px-0.5 rounded-xs box-decoration-clone" data-color="#9f1239" style="background-color: rgb(159, 18, 57); color: inherit;">Prepare for close up</mark></p><p></p><img-component src="https://storage.googleapis.com/X.png" height="257" width="500"></img-component><h3>Leaderboard</h3><ol><li><p>One fine pig</p></li><li><p>Team Sparkle</p></li><li><p><em>The Royal Court of Princess Donut</em></p></li></ol><p></p>'

describe('cellHtmlToPlainText', () => {
  it('flattens a full production cell to clean plain text', () => {
    const out = cellHtmlToPlainText(FIXTURE)
    expect(out).toBe(
      [
        'This one is by @Marty McFly and the crew of the $Flying Circus.',
        "Let's give an applause for their wonderful new vehicle, the $DeLorean DMC-5 👏👏👏",
        '',
        '@CAM-A Prepare for close up',
        '',
        '![image](https://storage.googleapis.com/X.png)',
        '',
        'Leaderboard',
        ' 1. One fine pig',
        ' 2. Team Sparkle',
        ' 3. The Royal Court of Princess Donut',
      ].join('\n'),
    )
  })

  it('keeps inline mentions inline — no mid-sentence line breaks, spacing preserved', () => {
    const out = cellHtmlToPlainText(
      '<p>hi <custom-mention data-mention-id="m1" data-fallback-name="Bob"></custom-mention> there</p>',
    )
    expect(out).toBe('hi @Bob there')
  })

  it('renders mentions and variables from their write-time fallback attributes (no live resolution)', () => {
    const html =
      '<p><custom-mention data-mention-id="m1" data-fallback-name="FallbackName"></custom-mention> at <variable data-variable-key="venue" data-fallback-value="FallbackVenue"></variable></p>'
    expect(cellHtmlToPlainText(html)).toBe('@FallbackName at $FallbackVenue')
  })

  it('renders an empty token when the fallback attribute is missing', () => {
    const html =
      '<p><custom-mention data-mention-id="m1"></custom-mention><variable data-variable-key="venue"></variable></p>'
    expect(cellHtmlToPlainText(html)).toBe('@$')
  })

  it('renders images as a markdown link so the URL survives', () => {
    expect(cellHtmlToPlainText('<img-component src="https://x/y.png"></img-component>')).toBe(
      '![image](https://x/y.png)',
    )
    // also standard <img>
    expect(cellHtmlToPlainText('<img src="https://x/z.png">')).toBe('![image](https://x/z.png)')
  })

  it('skips an image with no src', () => {
    expect(cellHtmlToPlainText('<img-component></img-component>')).toBe('')
  })

  it('renders anchor links as `text [href]` (html-to-text default)', () => {
    expect(cellHtmlToPlainText('<p>see <a href="https://example.com/path">our site</a> now</p>')).toBe(
      'see our site [https://example.com/path] now',
    )
    // bare link — text equals href, so it reads doubled (accepted default behavior)
    expect(cellHtmlToPlainText('<p><a href="https://example.com">https://example.com</a></p>')).toBe(
      'https://example.com [https://example.com]',
    )
  })

  it('renders files as `filename [url]` — the same form as links', () => {
    expect(cellHtmlToPlainText('<file-component filename="rundown.pdf" url="https://x/f.pdf"></file-component>')).toBe(
      'rundown.pdf [https://x/f.pdf]',
    )
  })

  it('falls back to "file" when a file has no filename, skips a file with no url', () => {
    expect(cellHtmlToPlainText('<file-component url="https://x/f.pdf"></file-component>')).toBe(
      'file [https://x/f.pdf]',
    )
    expect(cellHtmlToPlainText('<file-component filename="orphan.pdf"></file-component>')).toBe('')
  })

  it('flattens the `rs-*` vocabulary identically to the legacy tags (cell-tag migration safe)', () => {
    // Same content, post-migration tag names — must project byte-identically.
    const legacy =
      '<p><custom-mention data-mention-id="m1" data-fallback-name="Bob"></custom-mention> uses <variable data-variable-key="v" data-fallback-value="DeLorean"></variable></p><img-component src="https://x/y.png"></img-component><file-component filename="cue.pdf" url="https://x/f.pdf"></file-component>'
    const renamed =
      '<p><rs-mention data-mention-id="m1" data-fallback-name="Bob"></rs-mention> uses <rs-variable data-variable-key="v" data-fallback-value="DeLorean"></rs-variable></p><img src="https://x/y.png"><rs-file filename="cue.pdf" url="https://x/f.pdf"></rs-file>'
    expect(cellHtmlToPlainText(renamed)).toBe(cellHtmlToPlainText(legacy))
    expect(cellHtmlToPlainText(renamed)).toContain('@Bob uses $DeLorean')
    expect(cellHtmlToPlainText(renamed)).toContain('cue.pdf [https://x/f.pdf]')
  })

  it('does not word-wrap long lines', () => {
    const long = 'word '.repeat(40).trim()
    expect(cellHtmlToPlainText(`<p>${long}</p>`)).toBe(long)
  })

  it('does not upper-case headings', () => {
    expect(cellHtmlToPlainText('<h2>Leaderboard</h2>')).toBe('Leaderboard')
  })

  it('collapses stacked empty paragraphs to a single blank line', () => {
    expect(cellHtmlToPlainText('<p>a</p><p></p><p></p><p></p><p>b</p>')).toBe('a\n\nb')
  })

  it('puts each paragraph on its own line', () => {
    expect(cellHtmlToPlainText('<p>one</p><p>two</p>')).toBe('one\ntwo')
  })

  it('decodes HTML entities', () => {
    expect(cellHtmlToPlainText('<p>a &lt; b &amp; c</p>')).toBe('a < b & c')
  })

  it('returns empty string for empty / null input', () => {
    expect(cellHtmlToPlainText('')).toBe('')
    expect(cellHtmlToPlainText(null)).toBe('')
  })

  it('passes plain (non-HTML) text through — e.g. a select cell value', () => {
    expect(cellHtmlToPlainText('Option A')).toBe('Option A')
  })
})

import { describe, expect, test } from 'vitest'
import { fromPublicCellContent, plainTextToHtml, sanitizeCellHtml, toPublicCellHtml } from '../cellHtml'

// A real production cell in its PUBLIC wire form (api-v1-must-have §2 canonical
// fixture) — what a consumer sends on `content_html`. Exercises every edge in
// one string: all four custom tags in the public `rs-*`/`img` vocabulary + their
// `data-*`, `<span style="color">`, `<mark>` with class/data-color/inline style
// (incl. `color: inherit`), `<strong>`, an empty `<p></p>`, `&nbsp;`, and emoji.
const PUBLIC_FIXTURE =
  '<p>This one is by<span style="color: rgb(255, 255, 255);"> </span><rs-mention data-type="mention" data-mention-id="RH0Ao1j2pZu4DhccM4N3" data-fallback-name="Marty McFly"></rs-mention>&nbsp;and the crew of the <rs-variable data-type="variable" data-variable-key="venue" data-fallback-value="Flying Circus"></rs-variable>.</p><p>Let\'s give an applause for their <strong>wonderful</strong> new vehicle, the <rs-variable data-type="variable" data-variable-key="mount" data-fallback-value="DeLorean DMC-5"></rs-variable>&nbsp;👏👏👏 <img src="https://cdn.example/delorean.png"> <rs-file filename="specs.pdf" url="https://cdn.example/specs.pdf"></rs-file></p><p></p><p><rs-mention data-type="mention" data-mention-id="wJWGny1OZ3cqQjvp8g0a" data-fallback-name="CAM-A"></rs-mention>&nbsp;<mark class="px-0.5 rounded-xs box-decoration-clone" data-color="#9f1239" style="background-color: rgb(159, 18, 57); color: inherit;">Prepare for close up</mark></p>'

describe('sanitizeCellHtml — adapts the public vocabulary to storage tags', () => {
  const out = sanitizeCellHtml(PUBLIC_FIXTURE)

  test('renames rs-mention/rs-variable/img/rs-file to the legacy storage tags', () => {
    expect(out).toContain('<custom-mention')
    expect(out).toContain('<variable')
    expect(out).toContain('<img-component')
    expect(out).toContain('<file-component')
    // the public names are fully consumed — none leak into storage
    expect(out).not.toContain('rs-mention')
    expect(out).not.toContain('rs-variable')
    expect(out).not.toContain('rs-file')
  })

  test('preserves the data-* payloads through the rename', () => {
    expect(out).toContain('data-mention-id="RH0Ao1j2pZu4DhccM4N3"')
    expect(out).toContain('data-fallback-name="Marty McFly"')
    expect(out).toContain('data-mention-id="wJWGny1OZ3cqQjvp8g0a"')
    expect(out).toContain('data-variable-key="venue"')
    expect(out).toContain('data-fallback-value="DeLorean DMC-5"')
    expect(out).toContain('data-type="mention"')
    expect(out).toContain('data-type="variable"')
  })

  test('keeps img src and file attributes on the renamed tags', () => {
    expect(out).toContain('<img-component src="https://cdn.example/delorean.png">')
    expect(out).toContain('filename="specs.pdf"')
    expect(out).toContain('url="https://cdn.example/specs.pdf"')
  })

  test('keeps text color, the mark (class/data-color/inline style), bold, empty p, emoji', () => {
    expect(out).toMatch(/<span style="color:\s*rgb\(255, 255, 255\)/)
    expect(out).toContain('class="px-0.5 rounded-xs box-decoration-clone"')
    expect(out).toContain('data-color="#9f1239"')
    expect(out).toContain('background-color:rgb(159, 18, 57)')
    expect(out).toContain('color:inherit')
    expect(out).toContain('<strong>wonderful</strong>')
    expect(out).toContain('<p></p>')
    expect(out).toContain('👏👏👏')
  })
})

describe('sanitizeCellHtml — idempotence', () => {
  test('sanitizing twice equals sanitizing once (storage tags pass through)', () => {
    const once = sanitizeCellHtml(PUBLIC_FIXTURE)
    const twice = sanitizeCellHtml(once)
    expect(twice).toBe(once)
  })
})

describe('sanitizeCellHtml — safety (XSS vectors stripped)', () => {
  test('removes <script> and its content', () => {
    expect(sanitizeCellHtml('<p>hi<script>alert(1)</script></p>')).toBe('<p>hi</p>')
  })

  test('removes event-handler attributes (onerror, onclick, …)', () => {
    const out = sanitizeCellHtml('<img src="x" onerror="alert(1)">')
    expect(out).not.toContain('onerror')
    expect(out).toContain('src="x"')
  })

  test('drops javascript: URLs', () => {
    expect(sanitizeCellHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
  })

  test('drops url() in style (exfil / SSRF via the external PDF renderer)', () => {
    const out = sanitizeCellHtml('<p style="background-color: url(http://evil)">x</p>')
    expect(out).not.toContain('url(')
    expect(out).not.toContain('evil')
  })

  test('escapes bare angle brackets and ampersands in text content', () => {
    expect(sanitizeCellHtml('a < b & c')).toBe('a &lt; b &amp; c')
  })

  test('strips unknown tags but keeps their text', () => {
    expect(sanitizeCellHtml('<section onclick="x">keep me</section>')).toBe('keep me')
  })

  test('strips event handlers from allowed tags (div is allowed for taskList)', () => {
    expect(sanitizeCellHtml('<div onclick="x">keep me</div>')).toBe('<div>keep me</div>')
  })
})

describe('toPublicCellHtml — projects storage tags up to the public vocabulary', () => {
  // Storage form (what Firestore actually holds): legacy node tags.
  const STORED =
    '<p>by <custom-mention data-type="mention" data-mention-id="RH0" data-fallback-name="Marty"></custom-mention> at <variable data-variable-key="venue" data-fallback-value="Circus"></variable> <img-component src="https://cdn.example/x.png"></img-component> <file-component filename="a.pdf" url="https://cdn.example/a.pdf"></file-component></p>'
  const out = toPublicCellHtml(STORED)

  test('renames the four storage tags to rs-mention/rs-variable/img/rs-file', () => {
    expect(out).toContain('<rs-mention')
    expect(out).toContain('<rs-variable')
    expect(out).toContain('<rs-file')
    expect(out).toContain('<img ')
    // legacy names never leak to the wire
    expect(out).not.toContain('custom-mention')
    expect(out).not.toContain('<variable')
    expect(out).not.toContain('img-component')
    expect(out).not.toContain('file-component')
  })

  test('img-component becomes a void <img> carrying its src', () => {
    expect(out).toContain('src="https://cdn.example/x.png"')
    expect(out).not.toContain('</img>')
  })

  test('preserves data-* and file attributes through the rename', () => {
    expect(out).toContain('data-mention-id="RH0"')
    expect(out).toContain('data-variable-key="venue"')
    expect(out).toContain('filename="a.pdf"')
  })

  test('empty string stays empty (cleared / non-richtext cell)', () => {
    expect(toPublicCellHtml('')).toBe('')
  })
})

describe('task-list markup (TipTap TaskList/TaskItem) survives both directions', () => {
  // What the dashboard editor serializes for a checked task item.
  const STORED_TASKLIST =
    '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>check audio</p></div></li></ul>'

  test('read projection keeps the label/input/div wrappers and checked state', () => {
    const out = toPublicCellHtml(STORED_TASKLIST)
    expect(out).toContain('<label>')
    expect(out).toContain('type="checkbox"')
    expect(out).toContain('checked')
    expect(out).toContain('<div>')
    expect(out).toContain('data-checked="true"')
    expect(out).toContain('check audio')
  })

  test('write path preserves the markup (read → write-back is not lossy)', () => {
    const out = sanitizeCellHtml(toPublicCellHtml(STORED_TASKLIST))
    expect(out).toContain('<label>')
    expect(out).toContain('type="checkbox"')
    expect(out).toContain('data-checked="true"')
    expect(out).toContain('<div><p>check audio</p></div>')
  })
})

describe('write → read round-trips through the adapter', () => {
  test('public → storage → public is stable and never leaks storage tags', () => {
    const stored = sanitizeCellHtml(PUBLIC_FIXTURE)
    const back = toPublicCellHtml(stored)
    // a second lap is a no-op
    expect(toPublicCellHtml(sanitizeCellHtml(back))).toBe(back)
    // the wire form carries the public vocabulary, not the storage tags
    expect(back).toContain('<rs-mention')
    expect(back).toContain('<rs-variable')
    expect(back).toContain('<rs-file')
    expect(back).toContain('<img ')
    expect(back).not.toContain('custom-mention')
    expect(back).not.toContain('img-component')
    // payloads survive the full trip
    expect(back).toContain('data-mention-id="RH0Ao1j2pZu4DhccM4N3"')
    expect(back).toContain('data-variable-key="venue"')
  })
})

describe('plainTextToHtml', () => {
  test('escapes HTML special characters and wraps in a paragraph', () => {
    expect(plainTextToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>')
  })

  test('escaped output is stable through the sanitizer (well-formed)', () => {
    const html = plainTextToHtml('a < b & c')
    expect(sanitizeCellHtml(html)).toBe(html)
  })

  test('converts newlines to <br>', () => {
    expect(plainTextToHtml('line1\nline2')).toBe('<p>line1<br>line2</p>')
  })

  test('empty string stays empty (cleared-but-present cell, not a delete)', () => {
    expect(plainTextToHtml('')).toBe('')
  })

  test('plain words round-trip unchanged', () => {
    expect(plainTextToHtml('track 7')).toBe('<p>track 7</p>')
  })
})

describe('fromPublicCellContent', () => {
  test('plaintext content → escaped + wrapped', () => {
    expect(fromPublicCellContent({ content: 'a < b' })).toEqual({ text: '<p>a &lt; b</p>' })
  })

  test('content_html → sanitized + adapted to storage tags', () => {
    expect(fromPublicCellContent({ content_html: '<p>hi<script>x</script></p>' })).toEqual({ text: '<p>hi</p>' })
    expect(fromPublicCellContent({ content_html: '<rs-mention data-mention-id="A"></rs-mention>' })).toEqual({
      text: '<custom-mention data-mention-id="A"></custom-mention>',
    })
  })

  test('content_html wins if both are present (schema normally forbids this)', () => {
    expect(fromPublicCellContent({ content: 'plain', content_html: '<p>rich</p>' })).toEqual({ text: '<p>rich</p>' })
  })

  test('empty content_html clears to empty content', () => {
    expect(fromPublicCellContent({ content_html: '' })).toEqual({ text: '' })
  })
})

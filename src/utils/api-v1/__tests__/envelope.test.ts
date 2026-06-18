import { describe, expect, test } from 'vitest'
import { buildRedirectBody, buildSuccessBody, generateRequestId } from '../envelope'

describe('generateRequestId', () => {
  test('mints the canonical req_<24 hex> format', () => {
    expect(generateRequestId()).toMatch(/^req_[0-9a-f]{24}$/)
  })

  test('is unique across calls', () => {
    expect(generateRequestId()).not.toBe(generateRequestId())
  })
})

describe('buildSuccessBody', () => {
  test('bakes the uniform envelope with an empty side_effects array', () => {
    expect(buildSuccessBody({ data: { x: 1 }, requestId: 'req_a', serverTime: 1000 })).toEqual({
      ok: true,
      message: 'OK',
      data: { x: 1 },
      meta: { request_id: 'req_a', server_time: 1000, side_effects: [] },
    })
  })

  test('defaults the message to OK and omits included when not given', () => {
    const body = buildSuccessBody({ data: null, requestId: 'req_a', serverTime: 1 })
    expect(body.message).toBe('OK')
    expect('included' in body).toBe(false)
  })

  test('emits included as a sibling of data when provided', () => {
    const body = buildSuccessBody({
      message: 'Created',
      data: { id: 'r1' },
      included: { cues: [] },
      requestId: 'req_a',
      serverTime: 1,
    })
    expect(body.included).toEqual({ cues: [] })
    expect(body.message).toBe('Created')
  })

  test('merges meta extras over the baked block (later wins)', () => {
    const body = buildSuccessBody({
      data: {},
      requestId: 'req_a',
      serverTime: 1,
      meta: { applied_includes: ['cues', 'columns'] },
    })
    expect(body.meta).toMatchObject({
      request_id: 'req_a',
      server_time: 1,
      side_effects: [],
      applied_includes: ['cues', 'columns'],
    })
  })

  test('a populated side_effects in meta overrides the empty default', () => {
    const se = [{ type: 'runner.retimed', delta_ms: -5000 }]
    const body = buildSuccessBody({ data: {}, requestId: 'req_a', serverTime: 1, meta: { side_effects: se } })
    expect(body.meta.side_effects).toEqual(se)
  })
})

describe('buildRedirectBody', () => {
  test('restates the location in-band with no data field', () => {
    const body = buildRedirectBody({
      message: 'Found',
      location: '/api-v1/rundowns/r1/status?token=t',
      requestId: 'req_a',
      serverTime: 2000,
    })
    expect(body).toEqual({
      ok: true,
      message: 'Found',
      location: '/api-v1/rundowns/r1/status?token=t',
      meta: { request_id: 'req_a', server_time: 2000, side_effects: [] },
    })
    expect('data' in body).toBe(false)
  })
})

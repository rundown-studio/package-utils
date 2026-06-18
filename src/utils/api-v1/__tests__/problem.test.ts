import { describe, expect, test } from 'vitest'
import {
  buildProblemBody,
  documentationUrl,
  OPENAPI_SPEC_ROUTE,
  PROBLEM_TYPE_PREFIX,
  problemTypeUrl,
  SPEC_URL,
} from '../problem'

describe('catalog helpers', () => {
  test('problemTypeUrl anchors the code on the catalog page', () => {
    expect(problemTypeUrl('auth.invalid_token')).toBe(`${PROBLEM_TYPE_PREFIX}#auth.invalid_token`)
  })

  test('documentationUrl mirrors problemTypeUrl today', () => {
    expect(documentationUrl('not_found')).toBe(problemTypeUrl('not_found'))
  })

  test('SPEC_URL is the prod-pinned spec route', () => {
    expect(SPEC_URL).toBe(`https://app.rundownstudio.app/api-v1${OPENAPI_SPEC_ROUTE}`)
  })
})

describe('buildProblemBody', () => {
  test('assembles the RFC 9457 body, resolving title from status', () => {
    expect(
      buildProblemBody({
        status: 404,
        code: 'rundowns.not_found',
        detail: 'No such rundown.',
        instance: '/api-v1/rundowns/r1',
        requestId: 'req_a',
        serverTime: 1000,
      }),
    ).toEqual({
      type: problemTypeUrl('rundowns.not_found'),
      title: 'Not Found',
      status: 404,
      code: 'rundowns.not_found',
      detail: 'No such rundown.',
      instance: '/api-v1/rundowns/r1',
      request_id: 'req_a',
      server_time: 1000,
      spec_url: SPEC_URL,
      documentation_url: documentationUrl('rundowns.not_found'),
    })
  })

  test('omits details when absent, includes it when present', () => {
    const without = buildProblemBody({
      status: 400,
      code: 'bad_request',
      detail: 'x',
      instance: '/i',
      requestId: 'r',
      serverTime: 1,
    })
    expect('details' in without).toBe(false)

    const withDetails = buildProblemBody({
      status: 400,
      code: 'bad_request',
      detail: 'x',
      instance: '/i',
      requestId: 'r',
      serverTime: 1,
      details: { unknown_includes: ['foo'] },
    })
    expect(withDetails.details).toEqual({ unknown_includes: ['foo'] })
  })

  test('falls back to a generic title for an unmapped status', () => {
    expect(
      buildProblemBody({ status: 418, code: 'teapot', detail: 'x', instance: '/i', requestId: 'r', serverTime: 1 })
        .title,
    ).toBe('Error')
  })
})

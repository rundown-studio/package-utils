import { expect } from 'chai'
import { fastDeepEqual } from '../dist/esm/index.js'
import npmFastDeepEqual from 'fast-deep-equal/es6/index.js'

describe('fastDeepEqual', () => {
  it('must be faster than JSON.stringify and fast-deep-equal', () => {
    const iterations = 1000

    const obj1 = {
      original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
      actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
      cues: {
        '#1': {
          id: '#1',
          index: 0,
          state: 'CUE_FUTURE',
          original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
          actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        },
        '#2': {
          id: '#2',
          index: 1,
          state: 'CUE_FUTURE',
          original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
          actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        },
        '#3': {
          id: '#3',
          index: 2,
          state: 'CUE_FUTURE',
          original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
          actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        }
      }
    }

    const obj2 = {
      original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
      actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 30 * 60000 },
      cues: {
        '#1': {
          id: '#1',
          index: 0,
          state: 'CUE_FUTURE',
          original: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
          actual: { start: new Date('2024-07-26T09:00:00.000Z'), duration: 5 * 60000 },
        },
        '#2': {
          id: '#2',
          index: 1,
          state: 'CUE_FUTURE',
          original: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
          actual: { start: new Date('2024-07-26T09:05:00.000Z'), duration: 10 * 60000 },
        },
        '#3': {
          id: '#3',
          index: 2,
          state: 'CUE_FUTURE',
          original: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
          actual: { start: new Date('2024-07-26T09:15:00.000Z'), duration: 15 * 60000 },
        }
      }
    }

    const start1 = performance.now()
    for (let i = 0; i < iterations; i++) {
      JSON.stringify(obj1) === JSON.stringify(obj2);
    }
    const duration1 = performance.now() - start1

    const start2 = performance.now()
    for (let i = 0; i < iterations; i++) {
      npmFastDeepEqual(obj1, obj2)
    }
    const duration2 = performance.now() - start2

    const start3 = performance.now()
    for (let i = 0; i < iterations; i++) {
      fastDeepEqual(obj1, obj2)
    }
    const duration3 = performance.now() - start3

    console.log(`
=== 1000 iterations ===
JSON.stringify:  ${duration1.toFixed(1)}ms
fast-deep-equal: ${duration2.toFixed(1)}ms
fastDeepEqual:   ${duration3.toFixed(1)}ms
=======================`)

    expect(duration3 < duration1).to.be.true
    expect(duration3 < duration2).to.be.true
  })

  it('should compare primitives correctly', () => {
    expect(fastDeepEqual(1, 1)).to.be.true
    expect(fastDeepEqual('hello', 'hello')).to.be.true
    expect(fastDeepEqual(true, true)).to.be.true
    expect(fastDeepEqual(null, null)).to.be.true
    expect(fastDeepEqual(undefined, undefined)).to.be.true
    expect(fastDeepEqual(1, 2)).to.be.false
    expect(fastDeepEqual('hello', 'world')).to.be.false
    expect(fastDeepEqual(true, false)).to.be.false
    expect(fastDeepEqual(null, undefined)).to.be.false
  })

  it('should compare arrays correctly', () => {
    expect(fastDeepEqual([], [])).to.be.true
    expect(fastDeepEqual([1, 2, 3], [1, 2, 3])).to.be.true
    expect(fastDeepEqual([1, [2, 3]], [1, [2, 3]])).to.be.true
    expect(fastDeepEqual([1, 2, 3], [1, 2, 4])).to.be.false
    expect(fastDeepEqual([1, 2], [1, 2, 3])).to.be.false
  })

  it('should compare objects correctly', () => {
    expect(fastDeepEqual({}, {})).to.be.true
    expect(fastDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).to.be.true
    expect(fastDeepEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } })).to.be.true
    expect(fastDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).to.be.true
    expect(fastDeepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).to.be.false
    expect(fastDeepEqual({ a: 1 }, { a: 1, b: 2 })).to.be.false
  })

  it('should compare arrays in objects correctly', () => {
    expect(fastDeepEqual({ a: [1, 2] }, { a: [1, 2] })).to.be.true
    expect(fastDeepEqual({ a: [1, 2] }, { a: [9, 9] })).to.be.false
    expect(fastDeepEqual({ a: [{ b: 1 }, 2] }, { a: [{ b: 1 }, 2] })).to.be.true
    expect(fastDeepEqual({ a: [{ b: 1 }, 2] }, { a: [{ b: 9 }, 2] })).to.be.false
    expect(fastDeepEqual({ a: [{ b: 1 }, 2] }, { a: [{ b: 1 }, 9] })).to.be.false
  })

  it('should compare Date objects correctly', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-01')
    const date3 = new Date('2023-01-02')
    expect(fastDeepEqual(date1, date2)).to.be.true
    expect(fastDeepEqual(date1, date3)).to.be.false
  })

  it('should handle nested structures', () => {
    const obj1 = { a: [1, { b: 2 }], c: { d: [3, 4] } }
    const obj2 = { a: [1, { b: 2 }], c: { d: [3, 4] } }
    const obj3 = { a: [1, { b: 3 }], c: { d: [3, 4] } }
    expect(fastDeepEqual(obj1, obj2)).to.be.true
    expect(fastDeepEqual(obj1, obj3)).to.be.false
  })

  it('should handle functions', () => {
    const func1 = () => {}
    const func2 = () => {}
    expect(fastDeepEqual(func1, func1)).to.be.true
    expect(fastDeepEqual(func1, func2)).to.be.false
  })

  it('should handle NaN correctly', () => {
    expect(fastDeepEqual(NaN, NaN)).to.be.true
    expect(fastDeepEqual({ a: NaN }, { a: NaN })).to.be.true
  })

  it('should handle different types correctly', () => {
    expect(fastDeepEqual(1, '1')).to.be.false
    expect(fastDeepEqual([], {})).to.be.false
    expect(fastDeepEqual(new Date(), {})).to.be.false
  })
})

import { describe, it, expect } from 'vitest';
import { getIndexWithPrefix } from '../src/getIndexWithPrefix';

describe('getIndexWithPrefix', () => {
  it('single letter prefix', () => {
    expect(getIndexWithPrefix(0, 'A')).toBe('A0');
  });

  it('single letter prefix with larger index', () => {
    expect(getIndexWithPrefix(10, 'C')).toBe('C10');
  });

  it('word prefix ending with separator', () => {
    expect(getIndexWithPrefix(1, 'DAY1_')).toBe('DAY1_1');
  });

  it('word prefix ending with dash', () => {
    expect(getIndexWithPrefix(100, 'SESSIONA-')).toBe('SESSIONA-100');
  });

  describe('padding (prefix is all zeroes)', () => {
    it('pads single zero prefix', () => {
      expect(getIndexWithPrefix(1, '0')).toBe('01');
    });

    it('does not pad when index already fills width', () => {
      expect(getIndexWithPrefix(10, '0')).toBe('10');
    });

    it('pads double zero prefix', () => {
      expect(getIndexWithPrefix(1, '00')).toBe('001');
    });

    it('pads double zero prefix with two-digit index', () => {
      expect(getIndexWithPrefix(72, '00')).toBe('072');
    });

    it('pads triple zero prefix with three-digit index', () => {
      expect(getIndexWithPrefix(72, '000')).toBe('0072');
    });

    it('does not pad when index exceeds width', () => {
      expect(getIndexWithPrefix(1000, '00')).toBe('1000');
    });

    it('index of 0 with padding', () => {
      expect(getIndexWithPrefix(0, '00')).toBe('000');
    });
  });

  it('empty prefix returns index as string', () => {
    expect(getIndexWithPrefix(5, '')).toBe('5');
  });

  it('prefix containing zeroes but not all zeroes', () => {
    expect(getIndexWithPrefix(5, 'A0')).toBe('A05');
    expect(getIndexWithPrefix(12, 'A0')).toBe('A012');
  });

  it('prefix with trailing zeroes', () => {
    expect(getIndexWithPrefix(3, 'ITEM0')).toBe('ITEM03');
    expect(getIndexWithPrefix(12, 'ITEM0')).toBe('ITEM012');
  });
});

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

  it('empty prefix returns index as string', () => {
    expect(getIndexWithPrefix(5, '')).toBe('5');
  });

  describe('padding', () => {
    it('pads index to specified width', () => {
      expect(getIndexWithPrefix(1, 'A', 3)).toBe('A001');
    });

    it('pads with no prefix', () => {
      expect(getIndexWithPrefix(1, '', 3)).toBe('001');
    });

    it('does not pad when index already meets width', () => {
      expect(getIndexWithPrefix(72, '', 2)).toBe('72');
    });

    it('pads when width exceeds index digits', () => {
      expect(getIndexWithPrefix(72, '', 4)).toBe('0072');
    });

    it('does not pad when index exceeds width', () => {
      expect(getIndexWithPrefix(1000, 'ITEM-', 2)).toBe('ITEM-1000');
    });

    it('pads index of 0', () => {
      expect(getIndexWithPrefix(0, '', 3)).toBe('000');
    });
  });
});

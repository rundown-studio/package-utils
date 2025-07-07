import {describe, it, expect} from 'vitest'
import {getChildrenTimestamps} from '../src/getChildrenTimestamps';
import {CueRunState} from "../src";
import {RundownCueOrderItem} from "@rundown-studio/types";

/**
 * npm run test -- tests/getChildrenTimestamps.test.js
 */

describe('getChildrenTimestamps', () => {
  // Test setup with mock data
  const mockTimestamps = {
    original: { start: new Date(), duration: 1000, daysPlus: 0 },
    actual: { start: new Date(), duration: 1000, daysPlus: 0 },
    cues: {
      'child1': {
        id: 'child1',
        index: 1,
        state: CueRunState.CUE_PAST,
        original: { start: new Date(), duration: 500, daysPlus: 0 },
        actual: { start: new Date(), duration: 500, daysPlus: 0 }
      },
      'child2': {
        id: 'child2',
        index: 2,
        state: CueRunState.CUE_ACTIVE,
        original: { start: new Date(), duration: 300, daysPlus: 0 },
        actual: { start: new Date(), duration: 300, daysPlus: 0 }
      },
      'child3': {
        id: 'child3',
        index: 3,
        state: CueRunState.CUE_NEXT,
        original: { start: new Date(), duration: 200, daysPlus: 0 },
        actual: { start: new Date(), duration: 200, daysPlus: 0 }
      },
      'otherChild1': {
        id: 'otherChild1',
        index: 4,
        state: CueRunState.CUE_FUTURE,
        original: { start: new Date(), duration: 400, daysPlus: 0 },
        actual: { start: new Date(), duration: 400, daysPlus: 0 }
      }
    }
  };

  const mockCueOrder = [
    {
      id: 'parent1',
      children: [
        { id: 'child1' },
        { id: 'child2' },
        { id: 'child3' }
      ]
    },
    {
      id: 'parent2',
      children: [
        { id: 'otherChild1' }
      ]
    },
    {
      id: 'parent3',
      children: null // Testing with null children
    },
    {
      id: 'parent4' // Testing with undefined children
    }
  ] as RundownCueOrderItem[];

  it('should return all child timestamps for the specified parent', () => {
    const result = getChildrenTimestamps('parent1', mockTimestamps, mockCueOrder);

    // Should return timestamps for all three children of parent1
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      mockTimestamps.cues['child1'],
      mockTimestamps.cues['child2'],
      mockTimestamps.cues['child3']
    ]);
  });

  it('should return an empty array when parent has no children', () => {
    // Test with parent that has null children
    let result = getChildrenTimestamps('parent3', mockTimestamps, mockCueOrder);
    expect(result).toHaveLength(0);

    // Test with parent that has undefined children
    result = getChildrenTimestamps('parent4', mockTimestamps, mockCueOrder);
    expect(result).toHaveLength(0);
  });

  it('should return an empty array when parent ID is not found', () => {
    const result = getChildrenTimestamps('nonExistentParent', mockTimestamps, mockCueOrder);
    expect(result).toHaveLength(0);
  });

  it('should handle a parent with only one child', () => {
    const result = getChildrenTimestamps('parent2', mockTimestamps, mockCueOrder);
    expect(result).toHaveLength(1);
    expect(result).toEqual([mockTimestamps.cues['otherChild1']]);
  });

  it('should handle an empty cue order array', () => {
    const result = getChildrenTimestamps('parent1', mockTimestamps, []);
    expect(result).toHaveLength(0);
  });

  it('should gracefully handle missing timestamps for a child', () => {
    // Create modified timestamps with a missing entry
    const incompleteTimestamps = {
      ...mockTimestamps,
      cues: mockTimestamps.cues
    };
    delete (incompleteTimestamps.cues as never)['child2'];

    // Should not throw but will include undefined in the result
    const result = getChildrenTimestamps('parent1', incompleteTimestamps, mockCueOrder);

    // Still returns 3 items, but one is undefined
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(incompleteTimestamps.cues['child1']);
    expect(result[1]).toBeUndefined(); // child2's timestamp is missing
    expect(result[2]).toBe(incompleteTimestamps.cues['child3']);
  });

});

import { expect } from 'chai'
import { moveCues } from '../dist/esm/index.js'

/**
 * npm run test -- tests/moveCues.test.js
 */

const cueOrder = [
  { id: 'cue1' }, // 1
  { id: 'cue2' }, // 2
  {
    id: 'group1', // 3
    children: [
      { id: 'cue3' }, // 3.1
      { id: 'cue4' }, // 3.2
    ],
  },
  { id: 'cue5' }, // 4
  {
    id: 'group2', // 5
    children: [
      { id: 'cue6' }, // 5.1
      { id: 'cue7' }, // 5.2
    ],
  },
  { id: 'cue8' }, // 6
]

describe('moveCues', () => {
  it('moves selected cue into a group position', async () => {
    const selectedCues = ['cue5']
    const destination = '3.2'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
          { id: 'cue5' },
        ],
      },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      { id: 'cue8' },
    ])
  })

  it('moves selected cue into the first position', async () => {
    const selectedCues = ['cue5']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue5' },
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
        ],
      },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      { id: 'cue8' },
    ])
  })

  it('moves selected cue into the last position', async () => {
    const selectedCues = ['cue5']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
        ],
      },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      { id: 'cue8' },
      { id: 'cue5' },
    ])
  })

  it('moves selected cues into the last position', async () => {
    const selectedCues = ['cue1', 'cue2']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
        ],
      },
      { id: 'cue5' },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      { id: 'cue8' },
      { id: 'cue1' },
      { id: 'cue2' },
    ])
  })

  it('moves selected cues after group', async () => {
    const selectedCues = ['cue1', 'cue2']
    const destination = '3'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
        ],
      },
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue5' },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      { id: 'cue8' },
    ])
  })

  it('moves group to the end', async () => {
    const selectedCues = ['group1']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue5' },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      { id: 'cue8' },
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
        ],
      },
    ])
  })

  it('moves group after group', async () => {
    const selectedCues = ['group1']
    const destination = '5'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue5' },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue4' },
        ],
      },
      { id: 'cue8' },
    ])
  })

  it.only('moves group inside group', async () => {
    const selectedCues = ['group1']
    const destination = '3.1'
    try {
      await moveCues(cueOrder, selectedCues, destination)
    } catch (error) {
      expect(error.message).to.equal('Cannot move a group header inside another group')
    }
  })
})
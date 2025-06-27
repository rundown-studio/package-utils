import { describe, it, expect } from 'vitest'
import { moveCues } from '../src/moveCues'
import { RundownCueOrderItem } from '@rundown-studio/types'

/**
 * npm run test -- tests/moveCues.test.js
 */

const cueOrder: RundownCueOrderItem[] = [
  { id: 'cue1' },
  { id: 'cue2' },
  {
    id: 'group3',
    children: [
      { id: 'cue3.1' },
      { id: 'cue3.2' },
    ],
  },
  { id: 'cue4' },
  {
    id: 'group5',
    children: [
      { id: 'cue5.1' },
      { id: 'cue5.2' },
    ],
  },
  { id: 'cue6' },
]

describe('moveCues', () => {
  it('moves selected cue into the first position', async () => {
    const selectedCues = ['cue4']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue4' },
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves selected cue into a middle position', async () => {
    const selectedCues = ['cue4']
    const destination = '2'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves selected cue into the last position', async () => {
    const selectedCues = ['cue4']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      { id: 'cue4' },
    ])
  })

  it('moves selected cue into the last position (using higher number)', async () => {
    const selectedCues = ['cue4']
    const destination = '100'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      { id: 'cue4' },
    ])
  })

  it('moves selected cue to a begining of group', async () => {
    const selectedCues = ['cue4']
    const destination = '3.0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue4' },
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves selected cue the middle of group', async () => {
    const selectedCues = ['cue4']
    const destination = '3.1'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue4' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves selected cue the end of group', async () => {
    const selectedCues = ['cue4']
    const destination = '3.2'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
          { id: 'cue4' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves selected cue the end of group (using higher number)', async () => {
    const selectedCues = ['cue4']
    const destination = '3.4'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
          { id: 'cue4' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves selected cues into the first position', async () => {
    const selectedCues = ['cue4', 'cue6']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue4' },
      { id: 'cue6' },
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
    ])
  })

  it('moves selected cues to a middle position', async () => {
    const selectedCues = ['cue1', 'cue2', 'cue6']
    const destination = '4'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      { id: 'cue4' },
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue6' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
    ])
  })

  it('moves selected cues into the last position', async () => {
    const selectedCues = ['cue1', 'cue2', 'cue4']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
    ])
  })

  it('moves selected cues into the last position (using higher number)', async () => {
    const selectedCues = ['cue1', 'cue2', 'cue4']
    const destination = '50'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
    ])
  })

  it('moves selected cues after group', async () => {
    const selectedCues = ['cue1', 'cue2']
    const destination = '3'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves group to the beginning', async () => {
    const selectedCues = ['group3']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves group to the middle', async () => {
    const selectedCues = ['group5']
    const destination = '2'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      { id: 'cue4' },
      { id: 'cue6' },
    ])
  })

  it('moves group to the end', async () => {
    const selectedCues = ['group3']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
    ])
  })

  it('moves group after group', async () => {
    const selectedCues = ['group3']
    const destination = '5'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves group inside group', async () => {
    const selectedCues = ['group3']
    const destination = '3.1'
    try {
      await moveCues(cueOrder, selectedCues, destination)
    } catch (error) {
      expect((error as Error).message).to.equal('Cannot move a group header inside another group')
    }
  })

  it('moves children to beginning', async () => {
    const selectedCues = ['cue3.1', 'cue3.2']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue3.1' },
      { id: 'cue3.2' },
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [],
      },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves children to middle', async () => {
    const selectedCues = ['cue3.1', 'cue3.2']
    const destination = '4'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [],
      },
      { id: 'cue4' },
      { id: 'cue3.1' },
      { id: 'cue3.2' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })

  it('moves children to end', async () => {
    const selectedCues = ['cue3.1', 'cue3.2']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [],
      },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      { id: 'cue3.1' },
      { id: 'cue3.2' },
    ])
  })

  it('moves children to end (using higher number)', async () => {
    const selectedCues = ['cue3.1', 'cue3.2']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group3',
        children: [],
      },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
      { id: 'cue3.1' },
      { id: 'cue3.2' },
    ])
  })

  it('moves various types of selected cues to another position', async () => {
    const selectedCues = ['cue2', 'group5', 'cue4', 'cue3.2']
    const destination = '1'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue3.2' },
      { id: 'cue4' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
        ],
      },
      { id: 'cue6' },
    ])
  })


  it('move selected cue to unexistent group position', async () => {
    const selectedCues = ['cue2']
    const destination = '4.1'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      {
        id: 'group3',
        children: [
          { id: 'cue3.1' },
          { id: 'cue3.2' },
        ],
      },
      { id: 'cue4' },
      { id: 'cue2' },
      {
        id: 'group5',
        children: [
          { id: 'cue5.1' },
          { id: 'cue5.2' },
        ],
      },
      { id: 'cue6' },
    ])
  })
})

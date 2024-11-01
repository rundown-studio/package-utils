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

  it('moves selected cue into a middle position', async () => {
    const selectedCues = ['cue5']
    const destination = '2'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue5' },
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

  it('moves selected cue into the last position (using higher number)', async () => {
    const selectedCues = ['cue5']
    const destination = '100'
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

  it('moves selected cue to a begining of group', async () => {
    const selectedCues = ['cue5']
    const destination = '3.0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [
          { id: 'cue5' },
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

  it('moves selected cue the middle of group', async () => {
    const selectedCues = ['cue5']
    const destination = '3.1'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [
          { id: 'cue3' },
          { id: 'cue5' },
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

  it('moves selected cue the end of group', async () => {
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

  it('moves selected cue the end of group (using higher number)', async () => {
    const selectedCues = ['cue5']
    const destination = '3.4'
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

  it('moves selected cues into the first position', async () => {
    const selectedCues = ['cue5', 'cue8']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue5' },
      { id: 'cue8' },
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
    ])
  })

  it('moves selected cues to a middle position', async () => {
    const selectedCues = ['cue1', 'cue2', 'cue8']
    const destination = '4'
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
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue8' },
      {
        id: 'group2',
        children: [
          { id: 'cue6' },
          { id: 'cue7' },
        ],
      },
    ])
  })

  it('moves selected cues into the last position', async () => {
    const selectedCues = ['cue1', 'cue2', 'cue5']
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
      { id: 'cue5' },
    ])
  })

  it('moves selected cues into the last position (using higher number)', async () => {
    const selectedCues = ['cue1', 'cue2', 'cue5']
    const destination = '50'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
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
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue5' },
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

  it('moves group to the beginning', async () => {
    const selectedCues = ['group1']
    const destination = '0'
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

  it('moves group to the middle', async () => {
    const selectedCues = ['group2']
    const destination = '2'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
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
      { id: 'cue5' },
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

  it('moves group inside group', async () => {
    const selectedCues = ['group1']
    const destination = '3.1'
    try {
      await moveCues(cueOrder, selectedCues, destination)
    } catch (error) {
      expect(error.message).to.equal('Cannot move a group header inside another group')
    }
  })

  it('moves children to beginning', async () => {
    const selectedCues = ['cue3', 'cue4']
    const destination = '0'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue3' },
      { id: 'cue4' },
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [],
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
    ])
  })

  it('moves children to middle', async () => {
    const selectedCues = ['cue3', 'cue4']
    const destination = '4'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [],
      },
      { id: 'cue5' },
      { id: 'cue3' },
      { id: 'cue4' },
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

  it('moves children to end', async () => {
    const selectedCues = ['cue3', 'cue4']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [],
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
      { id: 'cue3' },
      { id: 'cue4' },
    ])
  })

  it('moves children to end (using higher number)', async () => {
    const selectedCues = ['cue3', 'cue4']
    const destination = '6'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      {
        id: 'group1',
        children: [],
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
      { id: 'cue3' },
      { id: 'cue4' },
    ])
  })

  it('moves various types of selected cues to another position', async () => {
    const selectedCues = ['cue2', 'group2', 'cue5', 'cue4']
    const destination = '1'
    const newCueOrder = await moveCues(cueOrder, selectedCues, destination)

    expect(newCueOrder).to.deep.equal([
      { id: 'cue1' },
      { id: 'cue2' },
      { id: 'cue4' },
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
        ],
      },
      { id: 'cue8' },
    ])
  })
})

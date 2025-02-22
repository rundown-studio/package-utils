# createTimestamps Function Documentation

## Overview

The `createTimestamps` function is a core part of Rundown Studio that calculates timing information for show cues. It handles three distinct states of a show:

- PRESHOW: Planning phase before the show starts
- ONAIR: Show is currently running
- ENDED: Show has finished, preserving actual timings for analysis

## Key Concepts

### Runner States

- **PRESHOW**: `runner` is null, using planned timings only
- **ONAIR**: `runner` exists and has an active cue (`timesnap.cueId` is set)
- **ENDED**: `runner` exists but no active cue (`timesnap.cueId` is null)

### Cue Types

1. **Fixed Cues** (startMode = FIXED)
   - Have explicit start times
   - Can create day jumps using startDatePlus
   - Their daysPlus always equals startDatePlus
   - Act as anchors in the timeline

2. **Flexible Cues** (startMode = FLEXIBLE)
   - Chain from the previous cue's end time
   - Inherit their day from the timing chain
   - Their daysPlus is calculated relative to the first cue

### Time Reference Points

- **startTime**: The planned show start time (in UTC)
- **firstDay**: The actual reference point for day calculations
  - PRESHOW: equals startTime
  - ONAIR/ENDED: first elapsed cue time or kickoff time

## Function Operation

### 1. Initial Setup

```typescript
function createTimestamps(
  cues: RundownCue[],
  cueOrder: RundownCueOrderItem[],
  runner: Runner | null,
  startTime: Date,
  options: { timezone?: string, now?: Date } = {}
)
```

- Validates inputs
- Determines runner state
- Creates sorted, flat list of cues
- Establishes firstDay reference point

### 2. Original Timestamps (Planned Schedule)

The function calculates original timestamps differently based on cue type:

For Fixed Cues:
```typescript
start = applyDate(cue.startTime, addDays(eventFirstDay, cue.startDatePlus))
daysPlus = cue.startDatePlus
```

For Flexible Cues:
```typescript
start = previousEnd
daysPlus = differenceInCalendarDays(start, firstDay)
```

### 3. Actual Timestamps (Runtime)

During PRESHOW:
- Actual timestamps match original timestamps
- No runtime adjustments needed

During ONAIR:
- Past cues: Use elapsed actual times
- Current cue: Use runner.timesnap data
- Future cues: Project based on current state
  - Fixed cues maintain their offset pattern
  - Flexible cues chain from the last known point

During ENDED:
- All cues use their final elapsed times
- Maintains the actual show record

## Time Chaining Logic

Example timeline showing how cues chain together:

```
Fixed Cue A (day 0, 9:00 AM) ─┐
                              │ Duration: 1h
Flexible Cue B (10:00 AM) ←───┘ 
                              │ Duration: 30m
Flexible Cue C (10:30 AM) ←───┘
                              │ Duration: 2h
Fixed Cue D (day 1, 2:00 PM) ─┐
                              │ Duration: 1h
Flexible Cue E (3:00 PM) ←────┘
```

- Fixed cues can create jumps in time
- Flexible cues maintain continuous flow
- Day changes follow the natural progression of time

## Important Notes

1. Timezone Handling
   - All dates are stored in UTC
   - Timezone parameter used for day boundary calculations
   - Helper functions handle timezone-aware date operations

2. Runner Data
   - originalCues: Snapshot of planned timing
   - elapsedCues: Record of actual execution
   - timesnap: Current execution state

3. Memory Model
   - The function is pure and stateless
   - All state comes from the runner object
   - Results are deterministic for given inputs

## Common Pitfalls

1. Day Calculation
   - Don't assume daysPlus is always relative to rundown date
   - Remember flexible cues inherit their day from the chain
   - Fixed cues create new day anchors

2. Time References
   - Be careful mixing UTC and local times
   - Always use timezone-aware helper functions
   - Remember dates are stored in UTC but represent local time

3. State Transitions
   - PRESHOW to ONAIR: runner becomes non-null
   - ONAIR to ENDED: timesnap.cueId becomes null
   - State affects timing calculation strategy

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  debateEventBus,
  debatePayloadSatisfies,
  debateTutorialTriggerMatches,
} from './debateEventBus';

afterEach(() => {
  debateEventBus.clear();
});

describe('debatePayloadSatisfies', () => {
  it('treats omitted and undefined keys as wildcards', () => {
    const actual = { roundNumber: 1, roundId: 'r1', kind: 'npc', type: 'opening_constructive' };
    expect(debatePayloadSatisfies({ roundId: 'r1' }, actual)).toBe(true);
    expect(debatePayloadSatisfies({ roundId: 'r1', kind: undefined }, actual)).toBe(true);
    expect(debatePayloadSatisfies({ roundId: 'r2' }, actual)).toBe(false);
  });

  it('requires arrays to match length and each index', () => {
    expect(debatePayloadSatisfies(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(debatePayloadSatisfies(['a'], ['a', 'b'])).toBe(false);
    expect(debatePayloadSatisfies(['a', 'c'], ['a', 'b'])).toBe(false);
  });
});

describe('debateTutorialTriggerMatches', () => {
  it('matches on event name, then the optional where filter', () => {
    const payload = {
      roundNumber: 2,
      roundId: 'r2',
      kind: 'player' as const,
      type: 'crossfire' as const,
    };
    expect(
      debateTutorialTriggerMatches(
        { event: 'round:start', where: { roundId: 'r2' } },
        'round:start',
        payload,
      ),
    ).toBe(true);
    expect(
      debateTutorialTriggerMatches(
        { event: 'round:start', where: { roundId: 'r9' } },
        'round:start',
        payload,
      ),
    ).toBe(false);
    expect(debateTutorialTriggerMatches({ event: 'round:end' }, 'round:start', payload)).toBe(
      false,
    );
    expect(debateTutorialTriggerMatches({ event: 'round:start' }, 'round:start', payload)).toBe(
      true,
    );
  });
});

describe('debateEventBus', () => {
  it('delivers emit to subscribers and isolates a throwing listener', () => {
    const ok = vi.fn();
    const boom = vi.fn(() => {
      throw new Error('listener failed');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    debateEventBus.on('round:start', boom);
    debateEventBus.on('round:start', ok);

    const payload = {
      roundNumber: 1,
      roundId: 'r1',
      kind: 'npc' as const,
      type: 'opening_constructive' as const,
    };
    debateEventBus.emit('round:start', payload);

    expect(ok).toHaveBeenCalledWith(payload);
    expect(boom).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalled();
    expect(debateEventBus.listenerCount('round:start')).toBe(2);
    error.mockRestore();
  });

  it('fires once, then drops the listener; clear empties the bus', () => {
    const listener = vi.fn();
    debateEventBus.once('round:end', listener);
    const payload = {
      roundNumber: 1,
      roundId: 'r1',
      kind: 'npc' as const,
      type: 'opening_constructive' as const,
    };
    debateEventBus.emit('round:end', payload);
    debateEventBus.emit('round:end', payload);
    expect(listener).toHaveBeenCalledOnce();
    expect(debateEventBus.listenerCount('round:end')).toBe(0);

    debateEventBus.on('round:start', vi.fn());
    debateEventBus.clear();
    expect(debateEventBus.listenerCount('round:start')).toBe(0);
  });
});

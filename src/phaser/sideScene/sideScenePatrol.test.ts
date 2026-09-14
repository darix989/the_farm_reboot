import { describe, expect, it } from 'vitest';
import { initPatrolState, stepPatrol, type PatrolState } from './sideScenePatrol';
import type { SideNpcPatrol } from '../../types/sideScene';

const PATROL: SideNpcPatrol = { fromX: 100, toX: 300, speed: 100, pauseMs: 500 };

describe('initPatrolState', () => {
  it('starts moving in the direction it is facing', () => {
    expect(initPatrolState(PATROL, 150, 'right')).toEqual({
      x: 150,
      dir: 1,
      pauseRemainingMs: 0,
      moving: true,
    });
    expect(initPatrolState(PATROL, 150, 'left')).toMatchObject({ dir: -1, moving: true });
  });
});

describe('stepPatrol', () => {
  it('advances toward toX at the authored speed', () => {
    const state = initPatrolState(PATROL, 150, 'right');
    const next = stepPatrol(state, PATROL, 500);
    expect(next.x).toBeCloseTo(200);
    expect(next.moving).toBe(true);
    expect(next.pauseRemainingMs).toBe(0);
  });

  it('advances toward fromX when travelling left', () => {
    const state = initPatrolState(PATROL, 200, 'left');
    const next = stepPatrol(state, PATROL, 500);
    expect(next.x).toBeCloseTo(150);
  });

  it('clamps exactly to toX and opens the pause, even on a long frame', () => {
    const state = initPatrolState(PATROL, 290, 'right');
    const next = stepPatrol(state, PATROL, 5000);
    expect(next.x).toBe(300);
    expect(next.moving).toBe(false);
    expect(next.pauseRemainingMs).toBe(500);
    expect(next.dir).toBe(1);
  });

  it('clamps exactly to fromX and opens the pause, even on a long frame', () => {
    const state = initPatrolState(PATROL, 110, 'left');
    const next = stepPatrol(state, PATROL, 5000);
    expect(next.x).toBe(100);
    expect(next.moving).toBe(false);
    expect(next.pauseRemainingMs).toBe(500);
  });

  it('does not move, and does not turn, while paused', () => {
    let state: PatrolState = { x: 300, dir: 1, pauseRemainingMs: 500, moving: false };
    state = stepPatrol(state, PATROL, 200);
    expect(state.x).toBe(300);
    expect(state.dir).toBe(1);
    expect(state.moving).toBe(false);
    expect(state.pauseRemainingMs).toBe(300);
  });

  it('turns around only once the pause at toX expires', () => {
    let state: PatrolState = { x: 300, dir: 1, pauseRemainingMs: 100, moving: false };
    state = stepPatrol(state, PATROL, 100);
    expect(state).toEqual({ x: 300, dir: -1, pauseRemainingMs: 0, moving: true });
  });

  it('turns around only once the pause at fromX expires', () => {
    let state: PatrolState = { x: 100, dir: -1, pauseRemainingMs: 100, moving: false };
    state = stepPatrol(state, PATROL, 100);
    expect(state).toEqual({ x: 100, dir: 1, pauseRemainingMs: 0, moving: true });
  });

  it('a zero-length or inverted span never moves', () => {
    const flat: SideNpcPatrol = { fromX: 200, toX: 200, speed: 100 };
    const inverted: SideNpcPatrol = { fromX: 300, toX: 100, speed: 100 };
    const state = initPatrolState(flat, 200, 'right');
    expect(stepPatrol(state, flat, 1000)).toMatchObject({ x: 200, moving: false });
    expect(stepPatrol(state, inverted, 1000)).toMatchObject({ x: 200, moving: false });
  });

  it('uses the default speed and pause when unauthored', () => {
    const patrol: SideNpcPatrol = { fromX: 0, toX: 1000 };
    const state = initPatrolState(patrol, 0, 'right');
    const next = stepPatrol(state, patrol, 1000);
    // DEFAULT_PATROL_SPEED (140) * 1s
    expect(next.x).toBeCloseTo(140);
  });
});

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useShooterSnapshot } from './useShooterSnapshot';
import type { ShooterSnapshot } from '../types/arena-shooter.types';

function makeSnapshot(tick: number, timestamp: number): ShooterSnapshot {
  return {
    roomId: 'test',
    tick,
    timestamp,
    players: [
      { userId: 'p1', x: 100, y: 200, vx: 0, vy: 0, name: 'P1', health: 100, shield: 0, kills: 0, deaths: 0 },
      { userId: 'p2', x: 300, y: 400, vx: 5, vy: 3, name: 'P2', health: 100, shield: 0, kills: 0, deaths: 0 },
    ],
    projectiles: [
      { id: 'proj1', x: 500, y: 600, vx: 8, vy: 0, ownerId: 'p1' },
    ],
    structures: [],
  };
}

describe('useShooterSnapshot', () => {
  it('returns default body when no snapshots pushed', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    const player = result.current.getInterpolatedPlayer('p1', 0);
    expect(player.x).toBe(400);
    expect(player.y).toBe(300);
  });

  it('returns latest player when only one snapshot', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    act(() => { result.current.pushSnapshot(makeSnapshot(1, 1000)); });
    const player = result.current.getInterpolatedPlayer('p1', 1000);
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });

  it('interpolates player position at t=0.5', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    const s0 = makeSnapshot(1, 1000);
    const s1 = makeSnapshot(2, 2000);
    s0.players[0].x = 100;
    s1.players[0].x = 200;
    act(() => { result.current.pushSnapshot(s0); });
    act(() => { result.current.pushSnapshot(s1); });
    const player = result.current.getInterpolatedPlayer('p1', 1500);
    expect(player.x).toBe(150);
    expect(player.y).toBe(200);
  });

  it('extrapolates player position beyond latest snapshot', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    const s0 = makeSnapshot(1, 1000);
    const s1 = makeSnapshot(2, 2000);
    s0.players[1].x = 300;
    s1.players[1].x = 350; // moved 50px in 1000ms → vx=5 per tick
    s1.players[1].vx = 5;
    act(() => { result.current.pushSnapshot(s0); });
    act(() => { result.current.pushSnapshot(s1); });
    // 500ms after s1 → half tick extrapolation
    const player = result.current.getInterpolatedPlayer('p2', 2500);
    expect(player.x).toBeGreaterThan(350);
  });

  it('returns empty array for projectiles when no snapshots', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    expect(result.current.getInterpolatedProjectiles(0)).toEqual([]);
  });

  it('interpolates projectiles at t=0.5', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    const s0 = makeSnapshot(1, 1000);
    const s1 = makeSnapshot(2, 2000);
    s0.projectiles[0].x = 500;
    s1.projectiles[0].x = 600;
    act(() => { result.current.pushSnapshot(s0); });
    act(() => { result.current.pushSnapshot(s1); });
    const projs = result.current.getInterpolatedProjectiles(1500);
    expect(projs[0].x).toBe(550);
  });

  it('getLatestPlayers returns players from latest snapshot', () => {
    const { result } = renderHook(() => useShooterSnapshot());
    const s0 = makeSnapshot(1, 1000);
    const s1 = makeSnapshot(2, 2000);
    s1.players[0].name = 'Updated';
    act(() => { result.current.pushSnapshot(s0); });
    act(() => { result.current.pushSnapshot(s1); });
    const players = result.current.getLatestPlayers();
    expect(players[0].name).toBe('Updated');
  });
});

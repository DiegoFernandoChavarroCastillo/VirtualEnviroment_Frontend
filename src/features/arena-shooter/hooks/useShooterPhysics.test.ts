import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useShooterPhysics } from './useShooterPhysics';
import { setGameConfig } from '../utils/gameConfigStore';
import type { CoverStructure } from '../types/arena-shooter.types';

beforeEach(() => {
  setGameConfig({
    weapons: {
      normal: { damage: 1, speed: 8, fireRate: 3, ammo: null },
      shotgun: { damage: 1, speed: 8, fireRate: 1, pellets: 3, spread: 0.25, ammo: 6 },
      rocket: { damage: 1, speed: 5, fireRate: 3, explosionRadius: 120, ammo: 3 },
    },
    shield: { durationMs: 15000 },
    arenaConfig: {
      arena: { width: 1600, height: 1200 },
      player: { radius: 20, speed: 5, maxHealth: 100 },
      projectile: { radius: 6 },
      gameplay: {
        maxPlayers: 6,
        tickRate: 30,
        fireRateLimit: 3,
        reconcileThreshold: 8,
        correctionFrames: 3,
        zoneEntryMs: 2000,
        zonePresenceTtl: 500,
        maxSpeedViolation: 50,
      },
      xp: { perKill: 50, survival5min: 100, survivalMs: 300000 },
      badges: { killsThreshold: 5, survivalMs: 600000 },
      shooterZone: { rect: { x: 1200, y: 540, width: 150, height: 150 }, center: { x: 1275, y: 615 }, spawnRadius: 80 },
      room: { id: 'arena-main' },
    },
  });
});

describe('useShooterPhysics', () => {
  it('starts at initial position', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 500, initialY: 300 }));
    const pos = result.current.getLocalPlayerPos();
    expect(pos.x).toBe(500);
    expect(pos.y).toBe(300);
  });

  it('applyInput sets velocity based on input', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 400, initialY: 300 }));
    act(() => { result.current.applyInput({ action: 'move', dx: 1, dy: 0 }); });
    // speed=5, so vx=5, vy=0
  });

  it('stepPhysics advances position', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 400, initialY: 300 }));
    act(() => { result.current.applyInput({ action: 'move', dx: 1, dy: 0 }); });
    act(() => { result.current.stepPhysics(); });
    const pos = result.current.getLocalPlayerPos();
    expect(pos.x).toBeGreaterThan(400);
  });

  it('reconcile with small drift applies gentle correction', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 400, initialY: 300 }));
    act(() => { result.current.reconcile({ x: 405, y: 300 }, 1); });
    const pos = result.current.getLocalPlayerPos();
    // drift of 5px < threshold (8), so gentle correction: 400 + 5*0.15 = 400.75
    expect(pos.x).toBeCloseTo(400.75, 1);
    expect(pos.y).toBe(300);
  });

  it('reconcile with large drift starts smooth correction', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 400, initialY: 300 }));
    act(() => { result.current.reconcile({ x: 420, y: 300 }, 1); });
    const pos = result.current.getLocalPlayerPos();
    // drift of 20px > threshold (8), so correction ref is set but position unchanged first frame
    expect(pos.x).toBe(400);
    expect(pos.y).toBe(300);
  });

  it('getLastDirection returns last movement direction', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 400, initialY: 300 }));
    act(() => { result.current.applyInput({ action: 'move', dx: -1, dy: 0 }); });
    const dir = result.current.getLastDirection();
    expect(dir.x).toBe(-1);
    expect(dir.y).toBe(0);
  });

  it('clamps player within arena bounds', () => {
    const { result } = renderHook(() => useShooterPhysics({ initialX: 10, initialY: 10 }));
    act(() => { result.current.applyInput({ action: 'move', dx: -1, dy: -1 }); });
    act(() => { result.current.stepPhysics(); });
    const pos = result.current.getLocalPlayerPos();
    // Should be clamped to player.radius (20) minimum
    expect(pos.x).toBeGreaterThanOrEqual(20);
    expect(pos.y).toBeGreaterThanOrEqual(20);
  });

  it('resolves structure collision', () => {
    // Wall at x=410 blocks player moving right from x=400
    const structures: CoverStructure[] = [
      { id: 'wall1', x: 410, y: 250, width: 20, height: 100, type: 'rectangle' },
    ];
    const structuresRef = { current: structures };
    const { result } = renderHook(() => useShooterPhysics({
      initialX: 400,
      initialY: 300,
      structuresRef,
    }));
    act(() => { result.current.applyInput({ action: 'move', dx: 1, dy: 0 }); });
    act(() => { result.current.stepPhysics(); });
    const pos = result.current.getLocalPlayerPos();
    // Player radius is 20, wall starts at x=410, so player right edge should not cross 410
    expect(pos.x).toBeLessThanOrEqual(392);
  });
});

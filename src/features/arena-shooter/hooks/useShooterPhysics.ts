import { useRef, useCallback, MutableRefObject } from 'react';
import {
  Vec2,
  ShooterInput,
  CoverStructure,
  lerp,
  PLAYER_SPEED,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_RADIUS,
  RECONCILE_THRESHOLD,
  CORRECTION_FRAMES,
} from '../types/arena-shooter.types';

interface Position extends Vec2 {}

interface UseShooterPhysicsOptions {
  initialX: number;
  initialY: number;
  /** Ref externo con las estructuras de cobertura para colisión cliente */
  structuresRef?: MutableRefObject<CoverStructure[]>;
}

interface UseShooterPhysicsReturn {
  getLocalPlayerPos: () => Position;
  getLastDirection: () => Vec2;
  applyInput: (input: ShooterInput) => void;
  stepPhysics: () => void;
  reconcile: (serverPos: Position, tick: number) => void;
}

/** Resuelve colisión círculo-AABB, devuelve posición corregida */
function resolveStructureCollision(pos: Vec2, s: CoverStructure, radius: number): Vec2 {
  const closestX = Math.max(s.x, Math.min(pos.x, s.x + s.width));
  const closestY = Math.max(s.y, Math.min(pos.y, s.y + s.height));
  const dx = pos.x - closestX;
  const dy = pos.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq === 0 || distSq >= radius * radius) return pos;
  const dist = Math.sqrt(distSq);
  const overlap = radius - dist;
  return { x: pos.x + (dx / dist) * overlap, y: pos.y + (dy / dist) * overlap };
}

export function useShooterPhysics({
  initialX,
  initialY,
  structuresRef,
}: UseShooterPhysicsOptions): UseShooterPhysicsReturn {
  const posRef = useRef<Position>({ x: initialX, y: initialY });
  const velRef = useRef<Vec2>({ x: 0, y: 0 });
  const lastDirRef = useRef<Vec2>({ x: 1, y: 0 });
  const lastStepTimeRef = useRef<number>(0);

  const correctionRef = useRef<{
    target: Position;
    framesLeft: number;
  } | null>(null);

  const applyInput = useCallback((input: ShooterInput) => {
    if (input.action !== 'move') return;
    const dx = input.dx ?? 0;
    const dy = input.dy ?? 0;
    velRef.current = { x: dx * PLAYER_SPEED, y: dy * PLAYER_SPEED };
    if (dx !== 0 || dy !== 0) {
      lastDirRef.current = { x: dx, y: dy };
    }
  }, []);

  const stepPhysics = useCallback(() => {
    const now = performance.now();
    const rawDelta = lastStepTimeRef.current ? now - lastStepTimeRef.current : 16.67;
    const deltaMs = Math.min(rawDelta, 100);
    lastStepTimeRef.current = now;

    const scale = deltaMs / 33.33;
    const pos = posRef.current;
    const vel = velRef.current;

    let nx = pos.x + vel.x * scale;
    let ny = pos.y + vel.y * scale;

    // Clamp a límites de arena
    nx = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, nx));
    ny = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, ny));

    // Resolver colisiones con estructuras (client-side)
    if (structuresRef?.current) {
      for (const s of structuresRef.current) {
        const resolved = resolveStructureCollision({ x: nx, y: ny }, s, PLAYER_RADIUS);
        nx = resolved.x;
        ny = resolved.y;
      }
    }

    // Aplicar corrección suave si está activa
    if (correctionRef.current && correctionRef.current.framesLeft > 0) {
      const { target, framesLeft } = correctionRef.current;
      const t = 1 / framesLeft;
      nx = lerp(nx, target.x, t);
      ny = lerp(ny, target.y, t);
      correctionRef.current.framesLeft--;
      if (correctionRef.current.framesLeft === 0) correctionRef.current = null;
    }

    posRef.current = { x: nx, y: ny };
  }, [structuresRef]);

  const reconcile = useCallback((serverPos: Position, _tick: number) => {
    const pos = posRef.current;
    const dx = serverPos.x - pos.x;
    const dy = serverPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RECONCILE_THRESHOLD) {
      correctionRef.current = { target: serverPos, framesLeft: CORRECTION_FRAMES };
    } else if (dist > 2) {
      posRef.current = { x: pos.x + dx * 0.15, y: pos.y + dy * 0.15 };
    }
  }, []);

  const getLocalPlayerPos = useCallback((): Position => ({ ...posRef.current }), []);
  const getLastDirection = useCallback((): Vec2 => ({ ...lastDirRef.current }), []);

  return { getLocalPlayerPos, getLastDirection, applyInput, stepPhysics, reconcile };
}

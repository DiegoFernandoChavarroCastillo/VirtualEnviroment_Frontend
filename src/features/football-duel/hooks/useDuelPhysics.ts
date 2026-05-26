import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { PlayerInput, PLAYER_SPEED, lerp } from '../types/football-duel.types';

const FIELD_W = 800;
const FIELD_H = 500;
const CORRECTION_FRAMES = 3; // Correcciones más rápidas (50ms en lugar de 133ms)
const RECONCILE_THRESHOLD = 15; // Píxeles - corregir drift más pequeño para evitar acumulación

interface Position {
  x: number;
  y: number;
}

interface UseDuelPhysicsOptions {
  initialX: number;
  initialY: number;
}

interface UseDuelPhysicsReturn {
  getLocalPlayerPos: () => Position;
  applyInput: (input: PlayerInput) => void;
  /** Call every frame to advance the local simulation */
  stepPhysics: () => void;
  /**
   * Server reconciliation: if the authoritative position differs by more than
   * RECONCILE_THRESHOLD pixels, smoothly correct over CORRECTION_FRAMES frames.
   */
  reconcile: (serverPos: Position, tick: number) => void;
}

/**
 * Client-side prediction using a local Matter.js engine.
 *
 * The local engine mirrors the server's physics for the LOCAL player only.
 * On each server snapshot, `reconcile()` compares the authoritative position
 * and applies a smooth correction if the drift exceeds the threshold.
 */
export function useDuelPhysics({ initialX, initialY }: UseDuelPhysicsOptions): UseDuelPhysicsReturn {
  const engineRef = useRef<Matter.Engine | null>(null);
  const playerBodyRef = useRef<Matter.Body | null>(null);

  // Correction state
  const correctionRef = useRef<{
    target: Position;
    framesLeft: number;
  } | null>(null);

  useEffect(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    const playerBody = Matter.Bodies.circle(initialX, initialY, 20, {
      frictionAir: 0.1,
      label: 'local-player',
    });
    Matter.World.add(engine.world, playerBody);

    engineRef.current = engine;
    playerBodyRef.current = playerBody;

    return () => {
      Matter.Engine.clear(engine);
      engineRef.current = null;
      playerBodyRef.current = null;
    };
  }, [initialX, initialY]);

  const stepPhysics = useCallback(() => {
    const engine = engineRef.current;
    const body = playerBodyRef.current;
    if (!engine || !body) return;

    // Advance local simulation one tick
    Matter.Engine.update(engine, 16.67);

    // Clamp to field bounds
    const x = Math.max(20, Math.min(FIELD_W - 20, body.position.x));
    const y = Math.max(20, Math.min(FIELD_H - 20, body.position.y));
    if (x !== body.position.x || y !== body.position.y) {
      Matter.Body.setPosition(body, { x, y });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
    }

    // Apply smooth correction if active
    if (correctionRef.current && correctionRef.current.framesLeft > 0) {
      const { target, framesLeft } = correctionRef.current;
      const t = 1 / framesLeft;
      const newX = lerp(body.position.x, target.x, t);
      const newY = lerp(body.position.y, target.y, t);
      Matter.Body.setPosition(body, { x: newX, y: newY });
      correctionRef.current.framesLeft--;
      if (correctionRef.current.framesLeft === 0) {
        correctionRef.current = null;
      }
    }
  }, []);

  const applyInput = useCallback((input: PlayerInput) => {
    const body = playerBodyRef.current;
    if (!body || input.action !== 'move') return;

    const vx = (input.dx ?? 0) * PLAYER_SPEED;
    const vy = (input.dy ?? 0) * PLAYER_SPEED;
    Matter.Body.setVelocity(body, { x: vx, y: vy });
  }, []);

  const reconcile = useCallback((serverPos: Position, _tick: number) => {
    const body = playerBodyRef.current;
    if (!body) return;

    const dx = serverPos.x - body.position.x;
    const dy = serverPos.y - body.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Teleport if drift is massive (>100px = likely reconnection or major desync)
    if (dist > 100) {
      Matter.Body.setPosition(body, serverPos);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      correctionRef.current = null;
      return;
    }

    // Smooth correction for smaller drift
    if (dist > RECONCILE_THRESHOLD) {
      correctionRef.current = { target: serverPos, framesLeft: CORRECTION_FRAMES };
    }
  }, []);

  const getLocalPlayerPos = useCallback((): Position => {
    const body = playerBodyRef.current;
    if (!body) return { x: initialX, y: initialY };
    return { x: body.position.x, y: body.position.y };
  }, [initialX, initialY]);

  return { getLocalPlayerPos, applyInput, stepPhysics, reconcile };
}

import { useRef, useCallback } from 'react';
import { DuelSnapshot, PhysicsBody, lerp } from '../types/football-duel.types';

const DEFAULT_BODY: PhysicsBody = { x: 400, y: 250, vx: 0, vy: 0 };
const RENDER_DELAY_MS = 100; // Render 100ms behind to ensure smooth interpolation

interface UseDuelSnapshotReturn {
  pushSnapshot: (snapshot: DuelSnapshot) => void;
  getInterpolatedBall: (renderTime: number) => PhysicsBody;
  getInterpolatedOpponent: (renderTime: number, opponentId: string) => PhysicsBody;
  getCurrentTick: () => number;
}

/**
 * Maintains a 2-snapshot ring buffer and provides linear interpolation
 * between the two most recent server snapshots.
 *
 * Client-side prediction for the LOCAL player is handled separately in
 * useDuelPhysics; this hook only interpolates the BALL and the OPPONENT.
 */
export function useDuelSnapshot(): UseDuelSnapshotReturn {
  // Ring buffer: [older, newer]
  const bufferRef = useRef<[DuelSnapshot | null, DuelSnapshot | null]>([null, null]);

  const pushSnapshot = useCallback((snapshot: DuelSnapshot) => {
    const [, prev] = bufferRef.current;
    bufferRef.current = [prev, snapshot];
  }, []);

  const getInterpolatedBall = useCallback((renderTime: number): PhysicsBody => {
    const [prev, next] = bufferRef.current;
    if (!next) return DEFAULT_BODY;
    if (!prev) return next.ball;

    // Apply render delay to smooth out jitter from network latency
    const adjustedRenderTime = renderTime - RENDER_DELAY_MS;

    const duration = next.timestamp - prev.timestamp;
    if (duration <= 0) return next.ball;

    let t = (adjustedRenderTime - prev.timestamp) / duration;

    // Extrapolation: if we're ahead of the latest snapshot, predict forward using velocity
    if (t > 1) {
      const extrapolationTime = (adjustedRenderTime - next.timestamp) / 1000; // seconds
      // Limit extrapolation to 200ms to avoid wild predictions
      const clampedTime = Math.min(extrapolationTime, 0.2);
      return {
        x: next.ball.x + next.ball.vx * clampedTime * 60, // vx is in px/tick, 60 ticks/s
        y: next.ball.y + next.ball.vy * clampedTime * 60,
        vx: next.ball.vx,
        vy: next.ball.vy,
      };
    }

    // Normal interpolation
    t = Math.min(1, Math.max(0, t));
    return {
      x: lerp(prev.ball.x, next.ball.x, t),
      y: lerp(prev.ball.y, next.ball.y, t),
      vx: next.ball.vx,
      vy: next.ball.vy,
    };
  }, []);

  const getInterpolatedOpponent = useCallback(
    (renderTime: number, opponentId: string): PhysicsBody => {
      const [prev, next] = bufferRef.current;
      if (!next) return DEFAULT_BODY;

      const nextPlayer = next.players.find((p) => p.userId === opponentId);
      if (!nextPlayer) return DEFAULT_BODY;
      if (!prev) return nextPlayer;

      const prevPlayer = prev.players.find((p) => p.userId === opponentId);
      if (!prevPlayer) return nextPlayer;

      // Apply render delay to smooth out jitter from network latency
      const adjustedRenderTime = renderTime - RENDER_DELAY_MS;

      const duration = next.timestamp - prev.timestamp;
      if (duration <= 0) return nextPlayer;

      let t = (adjustedRenderTime - prev.timestamp) / duration;

      // Extrapolation: predict opponent position forward using velocity
      if (t > 1) {
        const extrapolationTime = (adjustedRenderTime - next.timestamp) / 1000; // seconds
        // Limit extrapolation to 200ms to avoid wild predictions
        const clampedTime = Math.min(extrapolationTime, 0.2);
        return {
          x: nextPlayer.x + nextPlayer.vx * clampedTime * 60, // vx is in px/tick, 60 ticks/s
          y: nextPlayer.y + nextPlayer.vy * clampedTime * 60,
          vx: nextPlayer.vx,
          vy: nextPlayer.vy,
        };
      }

      // Normal interpolation
      t = Math.min(1, Math.max(0, t));
      return {
        x: lerp(prevPlayer.x, nextPlayer.x, t),
        y: lerp(prevPlayer.y, nextPlayer.y, t),
        vx: nextPlayer.vx,
        vy: nextPlayer.vy,
      };
    },
    [],
  );

  const getCurrentTick = useCallback((): number => {
    return bufferRef.current[1]?.tick ?? 0;
  }, []);

  return { pushSnapshot, getInterpolatedBall, getInterpolatedOpponent, getCurrentTick };
}

import { useRef, useCallback } from 'react';
import {
  ShooterSnapshot,
  ShooterPlayerState,
  Projectile,
  PhysicsBody,
  lerp,
} from '../types/arena-shooter.types';

const DEFAULT_BODY: PhysicsBody = { x: 400, y: 300, vx: 0, vy: 0 };

interface UseShooterSnapshotReturn {
  pushSnapshot: (snapshot: ShooterSnapshot) => void;
  getInterpolatedPlayer: (userId: string, renderTime: number) => PhysicsBody & Partial<ShooterPlayerState>;
  getInterpolatedProjectiles: (renderTime: number) => Projectile[];
  getCurrentTick: () => number;
  getLatestPlayers: () => ShooterPlayerState[];
}

/**
 * Ring buffer de 2 snapshots con interpolación lineal.
 * Sigue el mismo patrón que useDuelSnapshot.
 *
 * - Interpola posiciones de jugadores y proyectiles entre los dos últimos snapshots.
 * - El jugador LOCAL usa client-side prediction (useShooterPhysics), no este hook.
 * - Este hook se usa para renderizar los jugadores REMOTOS y los proyectiles.
 */
export function useShooterSnapshot(): UseShooterSnapshotReturn {
  // Ring buffer: [older, newer]
  const bufferRef = useRef<[ShooterSnapshot | null, ShooterSnapshot | null]>([null, null]);

  const pushSnapshot = useCallback((snapshot: ShooterSnapshot) => {
    const [, prev] = bufferRef.current;
    bufferRef.current = [prev, snapshot];
  }, []);

  /**
   * Retorna la posición interpolada (o extrapolada) de un jugador remoto.
   * - Si renderTime está entre prev y next: interpolación lineal.
   * - Si renderTime > next: extrapolación usando la velocidad del último snapshot
   *   (clampeada a máx 1 tick extra para evitar deriva excesiva).
   */
  const getInterpolatedPlayer = useCallback(
    (userId: string, renderTime: number): PhysicsBody & Partial<ShooterPlayerState> => {
      const [prev, next] = bufferRef.current;
      if (!next) return DEFAULT_BODY;

      const nextPlayer = next.players.find((p) => p.userId === userId);
      if (!nextPlayer) return DEFAULT_BODY;
      if (!prev) return nextPlayer;

      const prevPlayer = prev.players.find((p) => p.userId === userId);
      if (!prevPlayer) return nextPlayer;

      const duration = next.timestamp - prev.timestamp;
      if (duration <= 0) return nextPlayer;

      const t = (renderTime - prev.timestamp) / duration;

      if (t <= 1) {
        // Interpolación normal entre los dos snapshots
        const tc = Math.max(0, t);
        return {
          ...nextPlayer,
          x: lerp(prevPlayer.x, nextPlayer.x, tc),
          y: lerp(prevPlayer.y, nextPlayer.y, tc),
        };
      } else {
        // Extrapolación: renderTime pasó el snapshot más reciente
        // Usar velocidad del snapshot para predecir posición
        // Clampear a máx 1 tick (33ms) de extrapolación
        const extraMs = Math.min(renderTime - next.timestamp, 33.33);
        const scale = extraMs / 33.33;
        return {
          ...nextPlayer,
          x: Math.max(20, Math.min(1580, nextPlayer.x + nextPlayer.vx * scale)),
          y: Math.max(20, Math.min(1180, nextPlayer.y + nextPlayer.vy * scale)),
        };
      }
    },
    [],
  );

  /**
   * Retorna los proyectiles interpolados/extrapolados.
   */
  const getInterpolatedProjectiles = useCallback((renderTime: number): Projectile[] => {
    const [prev, next] = bufferRef.current;
    if (!next) return [];
    if (!prev) {
      // Solo un snapshot — extrapolar desde él
      const extraMs = Math.min(renderTime - next.timestamp, 33.33);
      const scale = extraMs / 33.33;
      return next.projectiles.map(proj => ({
        ...proj,
        x: proj.x + proj.vx * scale,
        y: proj.y + proj.vy * scale,
      }));
    }

    const duration = next.timestamp - prev.timestamp;
    if (duration <= 0) return next.projectiles;

    const t = (renderTime - prev.timestamp) / duration;

    if (t <= 1) {
      const tc = Math.max(0, t);
      return next.projectiles.map((proj) => {
        const prevProj = prev.projectiles.find((p) => p.id === proj.id);
        if (!prevProj) return proj;
        return {
          ...proj,
          x: lerp(prevProj.x, proj.x, tc),
          y: lerp(prevProj.y, proj.y, tc),
        };
      });
    } else {
      // Extrapolación
      const extraMs = Math.min(renderTime - next.timestamp, 33.33);
      const scale = extraMs / 33.33;
      return next.projectiles.map(proj => ({
        ...proj,
        x: proj.x + proj.vx * scale,
        y: proj.y + proj.vy * scale,
      }));
    }
  }, []);

  const getCurrentTick = useCallback((): number => {
    return bufferRef.current[1]?.tick ?? 0;
  }, []);

  const getLatestPlayers = useCallback((): ShooterPlayerState[] => {
    return bufferRef.current[1]?.players ?? [];
  }, []);

  return {
    pushSnapshot,
    getInterpolatedPlayer,
    getInterpolatedProjectiles,
    getCurrentTick,
    getLatestPlayers,
  };
}

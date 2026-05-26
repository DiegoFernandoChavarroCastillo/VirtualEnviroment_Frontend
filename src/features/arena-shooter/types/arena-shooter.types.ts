// ─── Primitivos ───────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface PhysicsBody extends Vec2 {
  vx: number;
  vy: number;
}

// ─── Jugador en la arena ──────────────────────────────────────────────────────

export interface ShooterPlayerInfo {
  userId: string;
  name: string;
  lives: number;   // 0–3
  kills: number;
  deaths: number;
}

export interface ShooterPlayerState extends ShooterPlayerInfo, PhysicsBody {}

// ─── Proyectil ────────────────────────────────────────────────────────────────

export interface Projectile extends PhysicsBody {
  id: string;       // uuid
  ownerId: string;  // userId del disparador
}

// ─── Estructura de cobertura ──────────────────────────────────────────────────

export interface CoverStructure {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'square' | 'rectangle';
}

// ─── Snapshot (servidor → cliente, cada 33 ms) ────────────────────────────────

export interface ShooterSnapshot {
  roomId: string;
  tick: number;
  timestamp: number;
  players: ShooterPlayerState[];
  projectiles: Projectile[];
  structures?: CoverStructure[];
}

// ─── Input (cliente → servidor) ──────────────────────────────────────────────

export type InputAction = 'move' | 'shoot';

export interface ShooterInput {
  action: InputAction;
  dx?: number;   // -1 | 0 | 1 (normalizado)
  dy?: number;
  /** Dirección de apuntado (Fase 3: mouse) */
  aimDx?: number;
  aimDy?: number;
}

// ─── Payloads de eventos ──────────────────────────────────────────────────────

export interface PlayerHitPayload {
  victimId: string;
  attackerId: string;
  livesRemaining: number;
}

export interface PlayerEliminatedPayload {
  eliminatedId: string;
  killerId: string;
}

export interface PlayerLeftPayload {
  userId: string;
  activePlayers: number;
}

export interface RoomStatePayload {
  roomId: string;
  players: ShooterPlayerInfo[];
  structures?: CoverStructure[];
  activePlayers: number;
}

export interface ReturnPayload {
  spawnX: number;
  spawnY: number;
}

// ─── Props del componente principal ──────────────────────────────────────────

export interface ArenaShooterProps {
  roomId: string;
  localPlayer: { userId: string; name: string };
  initialPlayers: ShooterPlayerInfo[];
  onReturn: (spawnX: number, spawnY: number) => void;
}

// ─── Constantes de juego ──────────────────────────────────────────────────────

export const ARENA_WIDTH = 1600;
export const ARENA_HEIGHT = 1200;
export const PLAYER_RADIUS = 20;
export const PROJECTILE_RADIUS = 6;
export const PROJECTILE_SPEED = 8;        // px/tick
export const PLAYER_SPEED = 5;            // px/tick
export const MAX_PLAYERS = 6;
export const INITIAL_LIVES = 3;
export const FIRE_RATE_LIMIT = 3;         // disparos/segundo
export const TICK_RATE = 30;              // ticks/segundo
export const TICK_MS = 1000 / TICK_RATE;  // 33.33 ms
export const RECONCILE_THRESHOLD = 40;    // píxeles — solo corregir drift grande
export const CORRECTION_FRAMES = 8;       // frames para suavizar la corrección (~133ms a 60fps)
export const ZONE_ENTRY_MS = 2000;        // ms para entrar
export const ZONE_PRESENCE_TTL = 500;     // ms TTL Redis
export const MAX_SPEED_VIOLATION = 50;    // px de tolerancia anti-cheat
export const REDIS_PERSIST_INTERVAL = 5000; // ms

/** Posición de la Shooter_Zone en el canvas del VirtualWorld (1600×1200) */
export const SHOOTER_ZONE_AREA = { x: 1200, y: 540, width: 150, height: 150 };

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Interpolación lineal */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Valida que un objeto desconocido sea un ShooterSnapshot bien formado.
 * Descarta snapshots inválidos sin interrumpir el render loop.
 */
export function isValidShooterSnapshot(raw: unknown): raw is ShooterSnapshot {
  if (typeof raw !== 'object' || raw === null) return false;
  const s = raw as Record<string, unknown>;
  return (
    typeof s.roomId === 'string' &&
    typeof s.tick === 'number' &&
    Array.isArray(s.players) &&
    Array.isArray(s.projectiles)
  );
}

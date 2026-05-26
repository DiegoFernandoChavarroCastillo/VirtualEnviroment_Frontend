// ─── Domain Types ─────────────────────────────────────────────────────────────

export type PadId = 'pad-a' | 'pad-b';
export type PadStatus = 'available' | 'occupied' | 'locked';
export type MatchStatus = 'waiting' | 'active' | 'finished';

// ─── Physics ──────────────────────────────────────────────────────────────────

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ─── Pad State ────────────────────────────────────────────────────────────────

export interface PadState {
  padId: PadId;
  status: PadStatus;
  occupantId?: string;
  occupantName?: string;
  occupiedAt?: number;
  /** 0.0 – 1.0 */
  activationProgress: number;
}

// ─── Player / Match ───────────────────────────────────────────────────────────

export interface PlayerInfo {
  userId: string;
  name: string;
  score: number;
}

export interface FootballDuelState {
  matchId: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  timeRemaining: number;
  status: MatchStatus;
  ball: PhysicsBody;
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export interface DuelSnapshot {
  matchId: string;
  tick: number;
  timestamp: number;
  ball: PhysicsBody;
  players: Array<{ userId: string } & PhysicsBody>;
  score: Record<string, number>;
}

// ─── Crown ────────────────────────────────────────────────────────────────────

export interface CrownState {
  winnerId: string | null;
  winnerName?: string;
  expiresAt: number;
}

// ─── Player Input ─────────────────────────────────────────────────────────────

export interface PlayerInput {
  action: 'move' | 'kick';
  dx?: number;
  dy?: number;
}

// ─── WebSocket Payloads ───────────────────────────────────────────────────────

export interface DuelStartedPayload {
  matchId: string;
  player1: { userId: string; name: string };
  player2: { userId: string; name: string };
}

export interface MatchEndedPayload {
  matchId: string;
  winnerId: string | null;
  winnerName?: string;
  isDraw: boolean;
  finalScore: Record<string, number>;
}

export interface ReturnToVirtualWorldPayload {
  spawnX: number;
  spawnY: number;
}

// ─── Canvas Constants ─────────────────────────────────────────────────────────

export const MATCH_CANVAS_WIDTH = 800;
export const MATCH_CANVAS_HEIGHT = 500;

/** Pad positions on the 1600×1200 virtual-world canvas */
export const PAD_AREAS: Record<PadId, { x: number; y: number; width: number; height: number }> = {
  'pad-a': { x: 620, y: 540, width: 120, height: 120 },
  'pad-b': { x: 760, y: 540, width: 120, height: 120 },
};

export const GOAL_AREAS = {
  left:  { x: 0,   y: 210, width: 20, height: 80 },
  right: { x: 780, y: 210, width: 20, height: 80 },
} as const;

export const AVATAR_RADIUS = 20;
export const BALL_RADIUS = 12;
export const KICK_RADIUS = 60;
export const PLAYER_SPEED = 5;
export const PAD_ZONE_CENTER = { x: 800, y: 600 };

/** Format seconds as MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Validate that an unknown object is a well-formed DuelSnapshot */
export function isValidSnapshot(obj: unknown): obj is DuelSnapshot {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.matchId === 'string' &&
    typeof s.tick === 'number' &&
    typeof s.timestamp === 'number' &&
    typeof s.ball === 'object' && s.ball !== null &&
    Array.isArray(s.players) &&
    typeof s.score === 'object' && s.score !== null
  );
}

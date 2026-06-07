// ─── Primitivos ───────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface PhysicsBody extends Vec2 {
  vx: number;
  vy: number;
}

// ─── Armas especiales ─────────────────────────────────────────────────────────

/** Tipos de arma disponibles */
export type WeaponType = 'normal' | 'shotgun' | 'rocket' | 'laser';

/** Tipos de pickup que pueden aparecer en el mapa */
export type PickupType = 'shotgun' | 'rocket' | 'shield' | 'health' | 'laser';

/**
 * Posiciones pre-definidas de spawn de cajas de pickup en el mapa.
 * Distribuidas en zonas abiertas, alejadas de estructuras y bordes.
 * Se verificaron contra todas las CoverStructure para evitar solapamientos.
 */
export const PICKUP_SPAWN_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 400,  y: 200  },
  { x: 1200, y: 200  },
  { x: 400,  y: 1000 },
  { x: 1200, y: 1000 },
  { x: 800,  y: 350  },
  { x: 800,  y: 850  },
  { x: 250,  y: 600  },
  { x: 1350, y: 600  },
  { x: 600,  y: 200  },
  { x: 1000, y: 200  },
  { x: 400,  y: 400  },
  { x: 800,  y: 400  },
  { x: 1200, y: 400  },
  { x: 700,  y: 600  },
  { x: 900,  y: 600  },
  { x: 400,  y: 800  },
  { x: 600,  y: 800  },
  { x: 1000, y: 800  },
  { x: 1200, y: 800  },
  { x: 1400, y: 800  },
  { x: 600,  y: 1000 },
  { x: 1000, y: 1000 },
] as const;

// ─── Jugador en la arena ──────────────────────────────────────────────────────

export interface ShooterPlayerInfo {
  userId: string;
  name: string;
  health: number;
  kills: number;
  deaths: number;
}

export interface ShooterPlayerState extends ShooterPlayerInfo, PhysicsBody {
  /** true mientras el escudo esté activo */
  shielded?: boolean;
}

// ─── Proyectil ────────────────────────────────────────────────────────────────

export interface Projectile extends PhysicsBody {
  id: string;       // uuid
  ownerId: string;  // userId del disparador
  /** Tipo de arma que lo generó; usado para el renderer */
  weaponType?: WeaponType;
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

export type InputAction = 'move' | 'shoot' | 'activateShield';

export interface ShooterInput {
  action: InputAction;
  dx?: number;   // -1 | 0 | 1 (normalizado)
  dy?: number;
  /** Dirección de apuntado (Fase 3: mouse) */
  aimDx?: number;
  aimDy?: number;
  /** Tipo de arma con la que se dispara (default: 'normal') */
  weaponType?: WeaponType;
}

// ─── Payloads de eventos ──────────────────────────────────────────────────────

export interface PlayerHitPayload {
  victimId: string;
  attackerId: string;
  healthRemaining: number;
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

/** Payload del evento rocketExplosion emitido por el servidor */
export interface RocketExplosionPayload {
  x: number;
  y: number;
  radius: number;
}

/** Emitido al cliente cuando el escudo absorbe un impacto (sin restar vida) */
export interface ShieldAbsorbedPayload {
  victimId: string;
}

// ─── Pickups (servidor → cliente) ──────────────────────────────────────────

export interface PickupBox {
  x: number;
  y: number;
  type: PickupType;
  spawnTime: number;
}

export interface PickupCollectedPayload {
  x: number;
  y: number;
  type: PickupType;
}

// ─── Props del componente principal ──────────────────────────────────────────

export interface ArenaShooterProps {
  roomId: string;
  localPlayer: { userId: string; name: string };
  initialPlayers: ShooterPlayerInfo[];
  onReturn: (spawnX: number, spawnY: number) => void;
}

/** Posición de la Shooter_Zone en el canvas del VirtualWorld (1600×1200) */
export const SHOOTER_ZONE_AREA = { x: 1200, y: 540, width: 150, height: 150 };

// ─── Game Config (recibida del servidor en el evento 'gameConfig') ──────────

export interface WeaponConfig {
  damage: number;
  speed: number;
  fireRate: number;
  ammo: number | null;
  pellets?: number;
  spread?: number;
  explosionRadius?: number;
}

export interface ShieldConfig {
  durationMs: number;
}

export interface ArenaConfig {
  arena: { width: number; height: number };
  player: { radius: number; speed: number; maxHealth: number };
  projectile: { radius: number };
  gameplay: {
    maxPlayers: number;
    tickRate: number;
    fireRateLimit: number;
    reconcileThreshold: number;
    correctionFrames: number;
    zoneEntryMs: number;
    zonePresenceTtl: number;
    maxSpeedViolation: number;
  };
  xp: { perKill: number; survival5min: number; survivalMs: number };
  badges: { killsThreshold: number; survivalMs: number };
  shooterZone: {
    rect: { x: number; y: number; width: number; height: number };
    center: { x: number; y: number };
    spawnRadius: number;
  };
  room: { id: string };
}

export interface SpawnRates {
  [pickupType: string]: number;
}

export interface GameConfig {
  weapons: Record<string, WeaponConfig>;
  shield: ShieldConfig | undefined;
  arenaConfig: ArenaConfig;
  spawnRates?: SpawnRates;
}

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

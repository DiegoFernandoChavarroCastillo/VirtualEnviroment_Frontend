import { useRef, useCallback } from 'react';
import {
  WeaponType,
  SHOTGUN_AMMO,
  SHOTGUN_FIRE_RATE_MS,
  ROCKET_AMMO,
  PICKUP_SPAWN_POSITIONS,
} from '../types/arena-shooter.types';

// ─── Constantes internas ─────────────────────────────────────────────────────

/** Radio de colisión de recogida (px) */
const PICKUP_RADIUS = 30;

/** Tamaño visual de la caja en canvas (px) */
const BOX_SIZE = 32;

/** Intervalo entre spawns de cajas (ms) */
const PICKUP_SPAWN_INTERVAL_MS = 15_000;

/** Duración de animación del pickup (ms) — para el glow al recoger */
const PICKUP_COLLECT_ANIM_MS = 600;

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface PickupBox {
  x: number;
  y: number;
  type: 'shotgun' | 'rocket' | 'shield';
  /** Si es false, aún no fue recogida */
  active: boolean;
}

interface ActiveWeapon {
  type: WeaponType;
  ammo: number;
  /** Timestamp del último disparo de escopeta (para rate limit local) */
  lastShotTime: number;
}

interface UseWeaponPickupsReturn {
  /** Comprueba si el jugador recoge una caja; retorna el tipo recogido o null */
  checkPickupCollision: (playerX: number, playerY: number) => WeaponType | 'shield' | null;
  /** Dibuja las cajas en el canvas (llamar dentro del game loop) */
  drawPickups: (ctx: CanvasRenderingContext2D, camX: number, camY: number, viewportW: number, viewportH: number) => void;
  /** Consume una bala; si llega a 0 resetea a normal. Retorna false si no se puede disparar. */
  consumeAmmo: () => boolean;
  /** Obtiene el estado actual del arma (sin causar re-render) */
  getActiveWeapon: () => Readonly<ActiveWeapon>;
}

/**
 * Hook que gestiona las cajas de pickup de armas especiales.
 *
 * - Las cajas NO son componentes React: se dibujan en canvas → 0 re-renders por frame.
 * - El arma activa vive en un ref → no causa re-renders al consumir ammo.
 * - El spawn de cajas usa un setInterval interno que se limpia al desmontar.
 * - Solo puede existir una caja activa a la vez para mantener el balance.
 */
export function useWeaponPickups(): UseWeaponPickupsReturn {
  // Caja activa en el mapa (null = ninguna)
  const activeBoxRef = useRef<PickupBox | null>(null);

  // Arma equipada por el jugador local
  const weaponRef = useRef<ActiveWeapon>({
    type: 'normal',
    ammo: 0,
    lastShotTime: 0,
  });

  // Timer de spawn — se limpia en cleanup
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timestamp del último pickup recogido (para animación visual)
  const lastPickupTimeRef = useRef<number>(0);

  // ─── Inicializar timer de spawn ─────────────────────────────────────────────

  if (!spawnTimerRef.current) {
    // Spawn inmediato al montar
    spawnRandomBox();

    spawnTimerRef.current = setInterval(() => {
      // Solo spawnear si no hay caja activa Y el jugador no tiene arma especial
      if (!activeBoxRef.current && weaponRef.current.type === 'normal') {
        spawnRandomBox();
      }
    }, PICKUP_SPAWN_INTERVAL_MS);
  }

  // ─── Helpers internos ───────────────────────────────────────────────────────

  function spawnRandomBox() {
    // Elegir posición aleatoria de las pre-definidas
    const idx = Math.floor(Math.random() * PICKUP_SPAWN_POSITIONS.length);
    const pos = PICKUP_SPAWN_POSITIONS[idx];
    // Alternar entre escopeta, cohete y escudo aleatoriamente
    const r = Math.random();
    const type: 'shotgun' | 'rocket' | 'shield' = r < 0.33 ? 'shotgun' : r < 0.66 ? 'rocket' : 'shield';
    activeBoxRef.current = { x: pos.x, y: pos.y, type, active: true };
  }

  // ─── API pública ────────────────────────────────────────────────────────────

  const checkPickupCollision = useCallback((playerX: number, playerY: number): WeaponType | 'shield' | null => {
    const box = activeBoxRef.current;
    if (!box || !box.active) return null;

    const dx = playerX - box.x;
    const dy = playerY - box.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= PICKUP_RADIUS * PICKUP_RADIUS) {
      // Pickup recogido
      const pickedType = box.type;
      activeBoxRef.current = null;
      lastPickupTimeRef.current = Date.now();

      if (pickedType === 'shield') {
        // Respawnear caja después del intervalo normal
        setTimeout(() => {
          if (!activeBoxRef.current && weaponRef.current.type === 'normal') {
            spawnRandomBox();
          }
        }, PICKUP_SPAWN_INTERVAL_MS);
        return pickedType;
      }

      // Equipar arma
      weaponRef.current = {
        type: pickedType,
        ammo: pickedType === 'shotgun' ? SHOTGUN_AMMO : ROCKET_AMMO,
        lastShotTime: 0,
      };

      // Respawnear caja después del intervalo normal
      setTimeout(() => {
        if (!activeBoxRef.current && weaponRef.current.type === 'normal') {
          spawnRandomBox();
        }
      }, PICKUP_SPAWN_INTERVAL_MS);

      return pickedType;
    }

    return null;
  }, []);

  const consumeAmmo = useCallback((): boolean => {
    const weapon = weaponRef.current;
    if (weapon.type === 'normal') return true; // normal: sin restricción desde aquí

    // Rate limit del cliente para escopeta
    if (weapon.type === 'shotgun') {
      const now = Date.now();
      if (now - weapon.lastShotTime < SHOTGUN_FIRE_RATE_MS) return false;
      weapon.lastShotTime = now;
    }

    weapon.ammo--;
    if (weapon.ammo <= 0) {
      // Agotar arma → volver al normal
      weaponRef.current = { type: 'normal', ammo: 0, lastShotTime: 0 };
    }
    return true;
  }, []);

  const getActiveWeapon = useCallback((): Readonly<ActiveWeapon> => weaponRef.current, []);

  /**
   * Dibuja las cajas de pickup en el canvas.
   * Llamar dentro del game loop DESPUÉS de ctx.translate(-camX, -camY).
   * Solo dibuja cajas que están dentro del viewport visible.
   */
  const drawPickups = useCallback((
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewportW: number,
    viewportH: number,
  ) => {
    const box = activeBoxRef.current;
    if (!box || !box.active) return;

    // Frustum culling: skip si está fuera del viewport
    if (
      box.x + BOX_SIZE < camX || box.x - BOX_SIZE > camX + viewportW ||
      box.y + BOX_SIZE < camY || box.y - BOX_SIZE > camY + viewportH
    ) return;

    const time = Date.now();
    const isShotgun = box.type === 'shotgun';
    const isRocket = box.type === 'rocket';
    const isShield = box.type === 'shield';

    // Flotación sinusoidal (sin allocaciones)
    const floatY = Math.sin(time / 600) * 5;
    const cx = box.x;
    const cy = box.y + floatY;

    // Pulso de glow
    const pulse = 0.65 + 0.35 * Math.sin(time / 350);
    let glowColor = '';
    let boxColor = '';
    let accentColor = '';
    let icon = '';
    let label = '';

    if (isShotgun) {
      glowColor = `rgba(243, 156, 18, ${pulse})`;
      boxColor = '#f39c12';
      accentColor = '#fff3cd';
      icon = '🔫';
      label = 'SHOTGUN';
    } else if (isRocket) {
      glowColor = `rgba(231, 76, 60, ${pulse})`;
      boxColor = '#c0392b';
      accentColor = '#ff8a80';
      icon = '🚀';
      label = 'ROCKET';
    } else if (isShield) {
      glowColor = `rgba(52, 152, 219, ${pulse})`;
      boxColor = '#2980b9';
      accentColor = '#d6eaf8';
      icon = '🛡️';
      label = 'SHIELD';
    }

    ctx.save();

    // Glow shadow
    ctx.shadowBlur = 18 * pulse;
    ctx.shadowColor = glowColor;

    // Cuerpo de la caja
    ctx.fillStyle = boxColor;
    ctx.fillRect(cx - BOX_SIZE / 2, cy - BOX_SIZE / 2, BOX_SIZE, BOX_SIZE);

    // Borde
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - BOX_SIZE / 2, cy - BOX_SIZE / 2, BOX_SIZE, BOX_SIZE);

    // Ícono interno
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy);

    // Etiqueta encima de la caja
    ctx.font = 'bold 10px "DM Sans", sans-serif';
    ctx.fillStyle = accentColor;
    ctx.shadowBlur = 6;
    ctx.shadowColor = glowColor;
    ctx.fillText(label, cx, cy - BOX_SIZE / 2 - 8);

    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }, []);

  return { checkPickupCollision, drawPickups, consumeAmmo, getActiveWeapon };
}

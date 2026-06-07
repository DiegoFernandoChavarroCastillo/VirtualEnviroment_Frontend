import { useRef, useCallback } from 'react';
import {
  WeaponType,
  PickupType,
  PICKUP_SPAWN_POSITIONS,
} from '../types/arena-shooter.types';
import { getGameConfig } from '../utils/gameConfigStore';
import { CanvasIconPaths, drawGameIcon } from '@/shared/icons/canvasIcons';

// ─── Constantes internas ─────────────────────────────────────────────────────

/** Radio de colisión de recogida (px) */
const PICKUP_RADIUS = 30;

/** Tamaño visual de la caja en canvas (px) */
const BOX_SIZE = 32;

/** Número máximo de cajas simultáneas en el mapa */
const MAX_BOXES = 3;

/** Tiempo de vida de una caja no recogida (ms) */
const BOX_LIFETIME_MS = 10_000;

/** Frecuencia de limpieza / re-spawn (ms) */
const CLEANUP_INTERVAL_MS = 500;

/** Distancia mínima entre cajas (px) */
const MIN_BOX_SPACING = 60;

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface PickupBox {
  x: number;
  y: number;
  type: PickupType;
  spawnTime: number;
}

interface ActiveWeapon {
  type: WeaponType;
  ammo: number;
  lastShotTime: number;
}

interface UseWeaponPickupsReturn {
  checkPickupCollision: (playerX: number, playerY: number) => PickupType | null;
  drawPickups: (ctx: CanvasRenderingContext2D, camX: number, camY: number, viewportW: number, viewportH: number) => void;
  consumeAmmo: () => boolean;
  getActiveWeapon: () => Readonly<ActiveWeapon>;
}

export function useWeaponPickups(): UseWeaponPickupsReturn {
  const boxesRef = useRef<PickupBox[]>([]);

  const weaponRef = useRef<ActiveWeapon>({
    type: 'normal',
    ammo: 0,
    lastShotTime: 0,
  });

  const lastPickupTimeRef = useRef<number>(0);
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function pickWeightedRandomType(): PickupType {
    const cfg = getGameConfig();
    const rates = cfg?.spawnRates ?? { shotgun: 25, rocket: 20, shield: 20, life: 20, laser: 15 };
    const entries = Object.entries(rates) as [string, number][];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [type, weight] of entries) {
      r -= weight;
      if (r <= 0) return type as PickupType;
    }
    return 'shotgun';
  }

  function getOccupiedPositions(): Set<number> {
    const occupied = new Set<number>();
    for (const box of boxesRef.current) {
      for (let i = 0; i < PICKUP_SPAWN_POSITIONS.length; i++) {
        const p = PICKUP_SPAWN_POSITIONS[i];
        const dx = p.x - box.x;
        const dy = p.y - box.y;
        if (dx * dx + dy * dy < MIN_BOX_SPACING * MIN_BOX_SPACING) {
          occupied.add(i);
        }
      }
    }
    return occupied;
  }

  function spawnBox(): void {
    const occupied = getOccupiedPositions();
    const available: number[] = [];
    for (let i = 0; i < PICKUP_SPAWN_POSITIONS.length; i++) {
      if (!occupied.has(i)) available.push(i);
    }
    if (available.length === 0) return;

    const idx = available[Math.floor(Math.random() * available.length)];
    const pos = PICKUP_SPAWN_POSITIONS[idx];
    const type = pickWeightedRandomType();
    boxesRef.current.push({ x: pos.x, y: pos.y, type, spawnTime: Date.now() });
  }

  function ensureBoxCount(): void {
    const toSpawn = MAX_BOXES - boxesRef.current.length;
    for (let i = 0; i < toSpawn; i++) {
      spawnBox();
    }
  }

  function removeExpired(): void {
    const now = Date.now();
    const alive: PickupBox[] = [];
    for (const box of boxesRef.current) {
      if (now - box.spawnTime < BOX_LIFETIME_MS) {
        alive.push(box);
      }
    }
    if (alive.length !== boxesRef.current.length) {
      boxesRef.current = alive;
    }
  }

  // ─── Inicializar ────────────────────────────────────────────────────────────

  if (!cleanupTimerRef.current) {
    ensureBoxCount();

    cleanupTimerRef.current = setInterval(() => {
      removeExpired();
      ensureBoxCount();
    }, CLEANUP_INTERVAL_MS);
  }

  // ─── API pública ────────────────────────────────────────────────────────────

  const checkPickupCollision = useCallback((playerX: number, playerY: number): PickupType | null => {
    const boxes = boxesRef.current;
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      const dx = playerX - box.x;
      const dy = playerY - box.y;
      if (dx * dx + dy * dy <= PICKUP_RADIUS * PICKUP_RADIUS) {
        const pickedType = box.type;
        boxes.splice(i, 1);
        lastPickupTimeRef.current = Date.now();

        if (pickedType === 'shield' || pickedType === 'life') {
          spawnBox();
          return pickedType;
        }

        const cfg = getGameConfig();
        const ammo = (cfg?.weapons[pickedType]?.ammo ?? 0) as number;
        weaponRef.current = {
          type: pickedType as WeaponType,
          ammo,
          lastShotTime: 0,
        };

        spawnBox();
        return pickedType;
      }
    }
    return null;
  }, []);

  const consumeAmmo = useCallback((): boolean => {
    const weapon = weaponRef.current;

    const cfg = getGameConfig();
    const weaponCfg = cfg?.weapons[weapon.type];
    const fireRate = weaponCfg?.fireRate ?? 3;
    const cooldownMs = fireRate > 0 ? 1000 / fireRate : 1000;
    const now = Date.now();
    if (now - weapon.lastShotTime < cooldownMs) return false;
    weapon.lastShotTime = now;

    if (weapon.type === 'normal') return true;

    weapon.ammo--;
    if (weapon.ammo <= 0) {
      weaponRef.current = { type: 'normal', ammo: 0, lastShotTime: 0 };
    }
    return true;
  }, []);

  const getActiveWeapon = useCallback((): Readonly<ActiveWeapon> => weaponRef.current, []);

  const drawPickups = useCallback((
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewportW: number,
    viewportH: number,
  ) => {
    const boxes = boxesRef.current;
    if (boxes.length === 0) return;

    const time = Date.now();

    for (const box of boxes) {
      // Frustum culling
      if (
        box.x + BOX_SIZE < camX || box.x - BOX_SIZE > camX + viewportW ||
        box.y + BOX_SIZE < camY || box.y - BOX_SIZE > camY + viewportH
      ) continue;

      const type = box.type;

      // Flotación sinusoidal individual
      const floatY = Math.sin((time + box.x * 7 + box.y * 13) / 600) * 5;
      const cx = box.x;
      const cy = box.y + floatY;

      // Pulso de glow
      const pulse = 0.65 + 0.35 * Math.sin((time + box.x * 11) / 350);
      let glowColor = '';
      let boxColor = '';
      let accentColor = '';
      let iconPath = '';
      let label = '';

      if (type === 'shotgun') {
        glowColor = `rgba(243, 156, 18, ${pulse})`;
        boxColor = '#f39c12';
        accentColor = '#fff3cd';
        iconPath = CanvasIconPaths.Shotgun;
        label = 'SHOTGUN';
      } else if (type === 'rocket') {
        glowColor = `rgba(231, 76, 60, ${pulse})`;
        boxColor = '#c0392b';
        accentColor = '#ff8a80';
        iconPath = CanvasIconPaths.Rocket;
        label = 'ROCKET';
      } else if (type === 'laser') {
        glowColor = `rgba(46, 204, 113, ${pulse})`;
        boxColor = '#27ae60';
        accentColor = '#a3e4d7';
        iconPath = CanvasIconPaths.Laser;
        label = 'LASER';
      } else if (type === 'shield') {
        glowColor = `rgba(52, 152, 219, ${pulse})`;
        boxColor = '#2980b9';
        accentColor = '#d6eaf8';
        iconPath = CanvasIconPaths.EnergyShield;
        label = 'SHIELD';
      } else if (type === 'life') {
        glowColor = `rgba(231, 76, 60, ${pulse})`;
        boxColor = '#e74c3c';
        accentColor = '#f1948a';
        label = '1UP';
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
      if (type === 'life') {
        drawHeart(ctx, cx, cy, 10, '#ffffff');
      } else {
        drawGameIcon(ctx, iconPath, cx, cy, 18, '#ffffff');
      }

      // Etiqueta encima de la caja
      ctx.font = 'bold 10px "DM Sans", sans-serif';
      ctx.fillStyle = accentColor;
      ctx.shadowBlur = 6;
      ctx.shadowColor = glowColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy - BOX_SIZE / 2 - 8);

      ctx.shadowBlur = 0;
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  }, []);

  return { checkPickupCollision, drawPickups, consumeAmmo, getActiveWeapon };
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx, cy + s * 0.8, cx - s, cy + s * 0.5, cx - s, cy);
  ctx.bezierCurveTo(cx - s, cy - s * 0.6, cx, cy - s * 0.4, cx, cy);
  ctx.bezierCurveTo(cx, cy - s * 0.4, cx + s, cy - s * 0.6, cx + s, cy);
  ctx.bezierCurveTo(cx + s, cy + s * 0.5, cx, cy + s * 0.8, cx, cy + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

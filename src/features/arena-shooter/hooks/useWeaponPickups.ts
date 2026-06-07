import { useRef, useCallback } from 'react';
import {
  WeaponType,
  PickupBox,
} from '../types/arena-shooter.types';
import { getGameConfig } from '../utils/gameConfigStore';
import { CanvasIconPaths, drawGameIcon } from '@/shared/icons/canvasIcons';

const PICKUP_RADIUS = 30;
const BOX_SIZE = 32;

interface ActiveWeapon {
  type: WeaponType;
  ammo: number;
  lastShotTime: number;
}

interface UseWeaponPickupsReturn {
  checkPickupCollision: (playerX: number, playerY: number, boxes: PickupBox[]) => PickupBox | null;
  drawPickups: (ctx: CanvasRenderingContext2D, camX: number, camY: number, viewportW: number, viewportH: number, boxes: PickupBox[]) => void;
  consumeAmmo: () => boolean;
  getActiveWeapon: () => Readonly<ActiveWeapon>;
  setWeapon: (type: WeaponType, ammo: number) => void;
}

export function useWeaponPickups(): UseWeaponPickupsReturn {
  const weaponRef = useRef<ActiveWeapon>({
    type: 'normal',
    ammo: 0,
    lastShotTime: 0,
  });

  const checkPickupCollision = useCallback((playerX: number, playerY: number, boxes: PickupBox[]): PickupBox | null => {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      const dx = playerX - box.x;
      const dy = playerY - box.y;
      if (dx * dx + dy * dy <= PICKUP_RADIUS * PICKUP_RADIUS) {
        return box;
      }
    }
    return null;
  }, []);

  const setWeapon = useCallback((type: WeaponType, ammo: number) => {
    weaponRef.current = { type, ammo, lastShotTime: 0 };
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
    boxes: PickupBox[],
  ) => {
    if (boxes.length === 0) return;

    const time = Date.now();

    for (const box of boxes) {
      if (
        box.x + BOX_SIZE < camX || box.x - BOX_SIZE > camX + viewportW ||
        box.y + BOX_SIZE < camY || box.y - BOX_SIZE > camY + viewportH
      ) continue;

      const type = box.type;

      const floatY = Math.sin((time + box.x * 7 + box.y * 13) / 600) * 5;
      const cx = box.x;
      const cy = box.y + floatY;

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
      } else if (type === 'health') {
        glowColor = `rgba(231, 76, 60, ${pulse})`;
        boxColor = '#e74c3c';
        accentColor = '#f1948a';
        label = 'HEALTH';
      }

      ctx.save();

      ctx.shadowBlur = 18 * pulse;
      ctx.shadowColor = glowColor;

      ctx.fillStyle = boxColor;
      ctx.fillRect(cx - BOX_SIZE / 2, cy - BOX_SIZE / 2, BOX_SIZE, BOX_SIZE);

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - BOX_SIZE / 2, cy - BOX_SIZE / 2, BOX_SIZE, BOX_SIZE);

      ctx.shadowBlur = 0;
      if (type === 'health') {
        drawPlus(ctx, cx, cy, 10, '#ffffff');
      } else {
        drawGameIcon(ctx, iconPath, cx, cy, 18, '#ffffff');
      }

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

  return { checkPickupCollision, drawPickups, consumeAmmo, getActiveWeapon, setWeapon };
}

function drawPlus(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  const s = size;
  const w = s * 0.25;
  const h = s * 0.5;
  ctx.fillRect(cx - w / 2, cy - h, w, h * 2);
  ctx.fillRect(cx - h, cy - w / 2, h * 2, w);
  ctx.restore();
}

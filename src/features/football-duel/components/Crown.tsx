import { AVATAR_RADIUS } from '../types/football-duel.types';

/**
 * Draws a golden crown above an avatar at (x, y).
 * Uses only Canvas 2D primitives — no external images required.
 *
 * @param ctx  - Canvas 2D rendering context
 * @param x    - Centre X of the avatar
 * @param y    - Centre Y of the avatar
 */
export function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const crownY = y - AVATAR_RADIUS - 20; // top of the crown — sits above the name label
  const w = 22;  // total width
  const h = 12;  // total height

  ctx.save();

  // ── Shadow ───────────────────────────────────────────────────────────────
  ctx.shadowBlur = 6;
  ctx.shadowColor = 'rgba(200, 150, 0, 0.6)';

  // ── Crown body (trapezoid base) ──────────────────────────────────────────
  const gradient = ctx.createLinearGradient(x - w / 2, crownY, x + w / 2, crownY + h);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.5, '#FFA500');
  gradient.addColorStop(1, '#FFD700');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  // Base: flat bottom
  ctx.moveTo(x - w / 2, crownY + h);
  ctx.lineTo(x + w / 2, crownY + h);
  // Right spike
  ctx.lineTo(x + w / 2, crownY + h * 0.4);
  // Right inner valley
  ctx.lineTo(x + w * 0.25, crownY + h * 0.7);
  // Centre spike (tallest)
  ctx.lineTo(x, crownY);
  // Left inner valley
  ctx.lineTo(x - w * 0.25, crownY + h * 0.7);
  // Left spike
  ctx.lineTo(x - w / 2, crownY + h * 0.4);
  ctx.closePath();
  ctx.fill();

  // ── Outline ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Jewels (small circles on the spikes) ─────────────────────────────────
  ctx.shadowBlur = 0;
  const jewels: [number, number, string][] = [
    [x, crownY + 2, '#FF4444'],           // centre – red
    [x + w * 0.38, crownY + h * 0.45, '#44AAFF'], // right – blue
    [x - w * 0.38, crownY + h * 0.45, '#44FF88'], // left – green
  ];

  for (const [jx, jy, color] of jewels) {
    ctx.beginPath();
    ctx.arc(jx, jy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.restore();
}

import { PadState, PadId, PAD_AREAS } from '../types/football-duel.types';

interface DrawDuelPadsOptions {
  ctx: CanvasRenderingContext2D;
  padStates: PadState[];
  localPlayerOverlap: PadId | null;
}

const PAD_NAMES: Record<PadId, string> = {
  'pad-a': 'Cancha A',
  'pad-b': 'Cancha B',
};

/** Draws an entire mini football pitch for a pad. */
function drawFootballPitch(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; width: number; height: number },
  isOverlap: boolean,
) {
  const { x, y, width: w, height: h } = area;

  // ── Shadow ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // ── Turf base (striped green) ────────────────────────────────────────────────
  const stripeW = 16;
  const stripeCount = Math.ceil(w / stripeW);
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#388e3c';
    ctx.fillRect(x + i * stripeW, y, Math.min(stripeW, w - i * stripeW), h);
  }

  // clip to pitch
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // ── Field lines ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;

  // Outer boundary
  ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

  // Centre line (horizontal split)
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h / 2);
  ctx.lineTo(x + w - 3, y + h / 2);
  ctx.stroke();

  // Centre circle
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Centre dot
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 2, 0, Math.PI * 2);
  ctx.fill();

  // Goal areas (top and bottom)
  const gaW = w * 0.4, gaH = h * 0.12;
  const gax = x + (w - gaW) / 2;
  ctx.strokeRect(gax, y + 3, gaW, gaH);
  ctx.strokeRect(gax, y + h - 3 - gaH, gaW, gaH);

  // Corner arcs
  const cR = 6;
  const corners = [
    [x + 3, y + 3, 0, Math.PI / 2],
    [x + w - 3, y + 3, Math.PI / 2, Math.PI],
    [x + w - 3, y + h - 3, Math.PI, Math.PI * 1.5],
    [x + 3, y + h - 3, Math.PI * 1.5, Math.PI * 2],
  ] as [number, number, number, number][];
  for (const [cx2, cy2, sa, ea] of corners) {
    ctx.beginPath();
    ctx.arc(cx2, cy2, cR, sa, ea);
    ctx.stroke();
  }

  ctx.restore();

  // ── Goal posts (top and bottom) ──────────────────────────────────────────────
  const postW = w * 0.3;
  const postX = x + (w - postW) / 2;
  const postDepth = 5;

  // Top goal
  ctx.fillStyle = 'rgba(220, 220, 230, 0.9)';
  ctx.fillRect(postX, y - postDepth, postW, postDepth);
  ctx.strokeStyle = 'rgba(180,180,190,0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(postX, y - postDepth, postW, postDepth);

  // Bottom goal
  ctx.fillStyle = 'rgba(220, 220, 230, 0.9)';
  ctx.fillRect(postX, y + h, postW, postDepth);
  ctx.strokeStyle = 'rgba(180,180,190,0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(postX, y + h, postW, postDepth);

  // ── Highlight border when player is on pad ────────────────────────────────────
  if (isOverlap) {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 250);
    ctx.strokeStyle = `rgba(255, 220, 0, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Glow
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(255, 220, 0, 0.7)';
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = 'rgba(100,200,80,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }
}

function drawLockedPad(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; width: number; height: number },
  pad: PadState,
): void {
  const { x, y, width: w, height: h } = area;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // Turf (desaturated)
  for (let i = 0; i < Math.ceil(w / 16); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3a3a42' : '#42424a';
    ctx.fillRect(x + i * 16, y, Math.min(16, w - i * 16), h);
  }

  // Diagonal stripes overlay
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 6;
  for (let i = -h; i < w + h; i += 14) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();

  // Pulsing dashed border
  const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
  ctx.strokeStyle = `rgba(160, 160, 175, ${pulse})`;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Lock icon
  const lx = cx, ly = cy - 10;
  const bw = 16, bh = 11, br = 3;
  const bx = lx - bw / 2, by = ly;

  ctx.beginPath();
  ctx.arc(lx, ly - 1, 6, Math.PI, 0, false);
  ctx.strokeStyle = 'rgba(220, 220, 230, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx + br, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, br);
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, br);
  ctx.arcTo(bx, by + bh, bx, by, br);
  ctx.arcTo(bx, by, bx + bw, by, br);
  ctx.closePath();
  ctx.fillStyle = 'rgba(220, 220, 230, 0.9)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(lx, by + bh / 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(60, 60, 70, 0.9)';
  ctx.fill();

  ctx.font = 'bold 9px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(220, 220, 230, 0.95)';
  ctx.textAlign = 'center';
  ctx.fillText('EN PARTIDA', cx, cy + 14);

  if (pad.occupantName) {
    ctx.font = '8px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    ctx.fillText(pad.occupantName, cx, cy + 24);
  }

  // Labels above
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(180, 180, 190, 0.85)';
  ctx.fillText('⚽ Fútbol 1v1', cx, y - 18);
  ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(160, 160, 170, 0.85)';
  ctx.fillText(pad.padId === 'pad-a' ? 'Cancha A' : 'Cancha B', cx, y - 6);
}

function drawActivationArc(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; width: number; height: number },
  progress: number,
) {
  if (progress <= 0) return;
  const cx = area.x + area.width / 2;
  const cy = area.y + area.height / 2;
  const r = Math.max(area.width, area.height) * 0.55;

  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = progress > 0.7 ? '#4cff80' : '#f1c40f';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10;
  ctx.shadowColor = progress > 0.7 ? '#4cff80' : '#f1c40f';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/**
 * Pure canvas drawing function for the two DuelPads.
 */
export function drawDuelPads({ ctx, padStates, localPlayerOverlap }: DrawDuelPadsOptions): void {
  for (const pad of padStates) {
    const area = PAD_AREAS[pad.padId];
    const isOverlap = localPlayerOverlap === pad.padId;
    const isLocked = pad.status === 'locked';
    const progress = pad.activationProgress ?? 0;

    if (isLocked) {
      drawLockedPad(ctx, area, pad);
    } else {
      drawFootballPitch(ctx, area, isOverlap);
      drawActivationArc(ctx, area, progress);
    }

    // ── Labels above each pad ──────────────────────────────────────────────────
    if (!isLocked) {
      ctx.fillStyle = isOverlap ? '#f1c40f' : '#1a5c1a';
      ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚽ Fútbol 1v1', area.x + area.width / 2, area.y - 18);
      ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = isOverlap ? '#e0a800' : '#2a6e2a';
      ctx.fillText(PAD_NAMES[pad.padId], area.x + area.width / 2, area.y - 6);

      if (pad.occupantName && pad.status === 'occupied') {
        ctx.font = '9px "DM Sans", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(pad.occupantName, area.x + area.width / 2, area.y + area.height / 2 + 4);
      }
    }
  }
}

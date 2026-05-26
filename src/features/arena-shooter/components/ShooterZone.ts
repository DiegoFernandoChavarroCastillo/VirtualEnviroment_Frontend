/**
 * drawShooterZone — arena táctica top-down con estética militar/sci-fi.
 */

export type ZoneState = 'available' | 'highlighted' | 'locked';

export interface ShooterZoneArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawShooterZoneOptions {
  ctx: CanvasRenderingContext2D;
  zone: ShooterZoneArea;
  state: ZoneState;
  /** 0.0 – 1.0 */
  progress: number;
  activePlayers: number;
}

export function drawShooterZone({
  ctx,
  zone,
  state,
  progress,
  activePlayers,
}: DrawShooterZoneOptions): void {
  const { x, y, width, height } = zone;
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (state === 'locked') {
    drawLockedZone(ctx, zone, activePlayers);
    return;
  }

  const isHighlighted = state === 'highlighted';
  const time = Date.now();

  // ── Shadow ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 5, y + 5, width, height);

  // ── Arena floor (dark concrete with grid pattern) ─────────────────────────
  ctx.fillStyle = '#2a2a35';
  ctx.fillRect(x, y, width, height);

  // Grid lines (tactical)
  ctx.strokeStyle = 'rgba(255,80,60,0.12)';
  ctx.lineWidth = 1;
  const gridStep = 20;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  for (let gx = x; gx <= x + width; gx += gridStep) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke();
  }
  for (let gy = y; gy <= y + height; gy += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke();
  }
  ctx.restore();

  // ── Corner fortifications ─────────────────────────────────────────────────
  const fortSize = 14;
  const forts = [
    { fx: x, fy: y },
    { fx: x + width - fortSize, fy: y },
    { fx: x, fy: y + height - fortSize },
    { fx: x + width - fortSize, fy: y + height - fortSize },
  ];
  for (const f of forts) {
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(f.fx, f.fy, fortSize, fortSize);
    ctx.strokeStyle = 'rgba(220,60,40,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(f.fx, f.fy, fortSize, fortSize);
  }

  // ── Cover structures (barrels / crates visual) ────────────────────────────
  const covers = [
    { bx: cx - 22, by: cy - 18, bw: 14, bh: 14 },
    { bx: cx + 8, by: cy - 18, bw: 14, bh: 14 },
    { bx: cx - 8, by: cy + 6, bw: 14, bh: 14 },
  ];
  for (const c of covers) {
    // box shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(c.bx + 2, c.by + 2, c.bw, c.bh);
    // box body
    ctx.fillStyle = isHighlighted ? '#8b3a1a' : '#6b2a0a';
    ctx.fillRect(c.bx, c.by, c.bw, c.bh);
    // top highlight
    ctx.fillStyle = 'rgba(255,150,80,0.3)';
    ctx.fillRect(c.bx, c.by, c.bw, c.bh * 0.35);
    // border
    ctx.strokeStyle = 'rgba(200,100,40,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.bx, c.by, c.bw, c.bh);
    // cross mark on barrel
    ctx.strokeStyle = 'rgba(255,120,60,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(c.bx + 3, c.by + 3);
    ctx.lineTo(c.bx + c.bw - 3, c.by + c.bh - 3);
    ctx.moveTo(c.bx + c.bw - 3, c.by + 3);
    ctx.lineTo(c.bx + 3, c.by + c.bh - 3);
    ctx.stroke();
  }

  // ── Crosshair icon (center) ───────────────────────────────────────────────
  drawCrosshairIcon(ctx, cx, cy, isHighlighted, time);

  // ── Animated border ───────────────────────────────────────────────────────
  if (isHighlighted) {
    const pulse = 0.7 + 0.3 * Math.sin(time / 200);
    ctx.strokeStyle = `rgba(255, 80, 40, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(255,60,30,0.8)';
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = 'rgba(200,50,30,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }

  // ── Labels above ──────────────────────────────────────────────────────────
  ctx.fillStyle = isHighlighted ? '#ff6040' : '#cc3020';
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔫 Arena Shooter', cx, y - 18);
  ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = isHighlighted ? '#ff8060' : '#aa2010';
  ctx.fillText(`${activePlayers}/6 jugadores`, cx, y - 6);

  // ── Progress bar ──────────────────────────────────────────────────────────
  if (isHighlighted) {
    const barH = 6;
    const barY = y + height + 4;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, barY, width, barH);

    if (progress > 0) {
      const barColor = progress > 0.7
        ? `rgba(60, 255, 100, ${0.85 + 0.15 * Math.sin(time / 150)})`
        : '#f1c40f';
      ctx.fillStyle = barColor;
      ctx.fillRect(x, barY, width * progress, barH);
      ctx.shadowBlur = progress > 0.7 ? 8 : 0;
      ctx.shadowColor = '#4cff80';

      const secondsLeft = Math.ceil((1 - progress) * 2);
      ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = '#ff8060';
      ctx.textAlign = 'center';
      ctx.fillText(`Entrando en ${secondsLeft}s`, cx, barY + barH + 10);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,180,150,0.8)';
      ctx.textAlign = 'center';
      ctx.fillText('Mantente aquí...', cx, barY + barH + 10);
    }

    drawActivationParticles(ctx, zone, Math.max(0.15, progress), time);
  }
}

// ─── Zona bloqueada ───────────────────────────────────────────────────────────

function drawLockedZone(
  ctx: CanvasRenderingContext2D,
  zone: ShooterZoneArea,
  activePlayers: number,
): void {
  const { x, y, width, height } = zone;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const time = Date.now();

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 5, y + 5, width, height);

  ctx.fillStyle = '#1a0808';
  ctx.fillRect(x, y, width, height);

  // Diagonal stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.strokeStyle = 'rgba(200, 50, 30, 0.12)';
  ctx.lineWidth = 8;
  for (let i = -height; i < width + height; i += 18) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + height, y + height);
    ctx.stroke();
  }
  ctx.restore();

  // Pulsing border
  const pulse = 0.55 + 0.45 * Math.sin(time / 300);
  ctx.strokeStyle = `rgba(231, 76, 60, ${pulse})`;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 8 * pulse;
  ctx.shadowColor = 'rgba(231,76,60,0.6)';
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // FULL text
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 120, 100, 0.95)';
  ctx.textAlign = 'center';
  ctx.fillText('SALA LLENA', cx, cy);
  ctx.font = '9px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 150, 130, 0.75)';
  ctx.fillText(`${activePlayers}/6 jugadores`, cx, cy + 14);

  // Labels above
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 140, 120, 0.85)';
  ctx.fillText('🔫 Arena Shooter', cx, y - 18);
}

// ─── Crosshair icon ──────────────────────────────────────────────────────────

function drawCrosshairIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  highlighted: boolean,
  time: number,
): void {
  const r = 10;
  const gap = 4;
  const rotate = highlighted ? (time / 2000) : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotate);

  const color = highlighted
    ? `rgba(255, 80, 40, ${0.7 + 0.3 * Math.sin(time / 200)})`
    : 'rgba(220, 60, 40, 0.85)';

  ctx.strokeStyle = color;
  ctx.lineWidth = highlighted ? 2.5 : 1.8;

  // Outer circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.stroke();

  // Cross lines
  ctx.beginPath();
  ctx.moveTo(-(r + gap), 0); ctx.lineTo(-gap, 0);
  ctx.moveTo(gap, 0); ctx.lineTo(r + gap, 0);
  ctx.moveTo(0, -(r + gap)); ctx.lineTo(0, -gap);
  ctx.moveTo(0, gap); ctx.lineTo(0, r + gap);
  ctx.stroke();

  // Centre dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Activation particles ─────────────────────────────────────────────────────

function drawActivationParticles(
  ctx: CanvasRenderingContext2D,
  zone: ShooterZoneArea,
  progress: number,
  time: number,
): void {
  const count = Math.max(4, Math.floor(progress * 14));
  const cx = zone.x + zone.width / 2;
  const cy = zone.y + zone.height / 2;
  const now = time / 250;

  ctx.save();
  for (let i = 0; i < count; i++) {
    const outerAngle = (i / count) * Math.PI * 2 + now;
    const outerR = zone.width * 0.62;
    const px = cx + Math.cos(outerAngle) * outerR;
    const py = cy + Math.sin(outerAngle) * outerR;
    const alpha = 0.5 + 0.5 * progress;
    const size = 2 + progress * 3.5;

    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 80, 40, ${alpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255, 60, 30, 0.9)';
    ctx.fill();
  }

  if (progress > 0.1) {
    const innerCount = Math.floor(progress * 8);
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2 - now * 1.5;
      const r = zone.width * 0.3;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 40, ${0.6 + 0.4 * progress})`;
      ctx.shadowBlur = 5;
      ctx.shadowColor = 'rgba(255, 200, 40, 0.9)';
      ctx.fill();
    }
  }

  ctx.restore();
}

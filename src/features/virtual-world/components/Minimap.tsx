import React, { useRef, useEffect, useCallback } from 'react';
import { Map } from 'lucide-react';
import { MINIMAP_ZONES } from '../config/minimap-zones';
import { UserInMap } from '../types/realtime.types';

// ─── World / minimap dimensions ───────────────────────────────────────────────
const WORLD_W = 1600;
const WORLD_H = 1200;
const MAP_W   = 160;   // minimap canvas width  (px)
const MAP_H   = 120;   // minimap canvas height (px)
const SCALE_X = MAP_W / WORLD_W;
const SCALE_Y = MAP_H / WORLD_H;

interface MinimapProps {
  /** Local player world position */
  playerX: number;
  playerY: number;
  /** Other users currently on the map */
  remoteUsers: UserInMap[];
  /** Whether the minimap panel is visible */
  visible: boolean;
  onToggle: () => void;
}

const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerY,
  remoteUsers,
  visible,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Background ────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    ctx.fillStyle = 'rgba(20, 20, 28, 0.88)';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // ── World border ──────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, MAP_W - 2, MAP_H - 2);

    // ── Grid (subtle) ─────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    const gridStep = 32 * SCALE_X * 5; // every 5 grid cells
    for (let x = 0; x < MAP_W; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke();
    }
    for (let y = 0; y < MAP_H; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
    }

    // ── Zones ─────────────────────────────────────────────────────────────
    for (const zone of MINIMAP_ZONES) {
      const mx = zone.x * SCALE_X;
      const my = zone.y * SCALE_Y;
      const mr = Math.max(4, zone.radius * SCALE_X);

      // Glow
      const grd = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      grd.addColorStop(0, zone.color + 'aa');
      grd.addColorStop(1, zone.color + '00');
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Border ring
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Icon
      ctx.font = `${Math.max(8, mr * 0.9)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.icon, mx, my);

      // Label below
      ctx.font = 'bold 6px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textBaseline = 'top';
      ctx.fillText(zone.label, mx, my + mr * 0.6 + 1);
    }

    // ── Remote users (small grey dots) ────────────────────────────────────
    for (const user of remoteUsers) {
      const ux = user.x * SCALE_X;
      const uy = user.y * SCALE_Y;
      ctx.beginPath();
      ctx.arc(ux, uy, 2, 0, Math.PI * 2);
      ctx.fillStyle = user.color ?? 'rgba(150,150,200,0.7)';
      ctx.fill();
    }

    // ── Local player (bright dot with pulse ring) ─────────────────────────
    const px = playerX * SCALE_X;
    const py = playerY * SCALE_Y;

    // Pulse ring
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 600));
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(231, 76, 60, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dot
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // "Tú" label
    ctx.font = 'bold 6px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Tú', px, py - 4);
  }, [playerX, playerY, remoteUsers]);

  // Redraw every frame so the pulse animation and position update smoothly
  useEffect(() => {
    if (!visible) return;
    let raf: number;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, draw]);

  return (
    <div
      className="absolute bottom-5 left-5 z-30 flex flex-col items-start gap-1 select-none"
      aria-label="Minimapa del entorno virtual"
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        title="Mostrar/ocultar mapa (M)"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 border border-white/15 text-white/70 hover:text-white hover:bg-black/80 transition-colors text-xs font-semibold backdrop-blur-sm"
      >
        <Map size={12} />
        {visible ? 'Ocultar mapa' : 'Ver mapa'}
      </button>

      {/* Minimap panel */}
      {visible && (
        <div
          className="rounded-xl overflow-hidden border border-white/15 shadow-2xl backdrop-blur-sm"
          style={{ width: MAP_W, height: MAP_H }}
        >
          <canvas
            ref={canvasRef}
            width={MAP_W}
            height={MAP_H}
            className="block"
          />
        </div>
      )}
    </div>
  );
};

export default Minimap;

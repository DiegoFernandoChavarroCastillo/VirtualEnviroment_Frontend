/**
 * WorldDecor — Elementos visuales decorativos del mapa top-down.
 * Árboles, caminos, edificios, césped, bancas, lámparas.
 */

export interface DecorItem {
  type: 'tree' | 'building' | 'bench' | 'lamp' | 'bush';
  x: number;
  y: number;
  w?: number;
  h?: number;
  variant?: number;
  label?: string;
}

// ─── Paleta de colores del campus ─────────────────────────────────────────────
const C = {
  grassBase: '#5a8c3a',
  grassLight: '#6da348',
  grassDark: '#4a7330',
  pathFill: '#c8b89a',
  pathEdge: '#b0a080',
  pathLine: '#d4c4aa',
  treeCanopy: '#2d7a2d',
  treeCanopyLight: '#3a9c3a',
  treeCanopyDark: '#1e5c1e',
  treeTrunk: '#7a5c35',
  buildingWall: '#d4c8b8',
  buildingRoof: '#a07850',
  buildingWindow: '#7ab8e0',
  buildingDoor: '#8b5e3c',
  benchWood: '#b07840',
  benchMetal: '#888',
  lampPost: '#666',
  lampGlow: 'rgba(255, 240, 160, 0.5)',
  bushGreen: '#3a7a2a',
  bushDark: '#2a5a1a',
};

// ─── Definición de caminos ────────────────────────────────────────────────────
export interface PathSegment {
  x: number; y: number; w: number; h: number;
}

export const WORLD_PATHS: PathSegment[] = [
  // Camino horizontal principal (centro)
  { x: 0, y: 575, w: 1600, h: 50 },
  // Camino vertical izquierdo
  { x: 200, y: 0, w: 50, h: 1200 },
  // Camino vertical derecho
  { x: 1350, y: 0, w: 50, h: 1200 },
  // Camino horizontal superior
  { x: 0, y: 180, w: 1600, h: 40 },
  // Camino horizontal inferior
  { x: 0, y: 980, w: 1600, h: 40 },
  // Camino diagonal zona central
  { x: 580, y: 400, w: 40, h: 320 },
];

// ─── Edificios del campus ─────────────────────────────────────────────────────
export const WORLD_BUILDINGS: DecorItem[] = [
  { type: 'building', x: 40, y: 40, w: 140, h: 100, label: 'Biblioteca' },
  { type: 'building', x: 240, y: 40, w: 120, h: 90, label: 'Cafetería' },
  { type: 'building', x: 420, y: 40, w: 100, h: 80, label: 'Lab A' },
  { type: 'building', x: 580, y: 40, w: 120, h: 90, label: 'Lab B' },
  { type: 'building', x: 760, y: 40, w: 100, h: 80, label: 'Aulas' },
  { type: 'building', x: 920, y: 40, w: 130, h: 90, label: 'Rectoría' },
  { type: 'building', x: 1110, y: 40, w: 100, h: 80, label: 'Salud' },
  { type: 'building', x: 1270, y: 40, w: 60, h: 110, label: 'Admin' },
  // Fila inferior
  { type: 'building', x: 40, y: 1060, w: 120, h: 90, label: 'Auditorio' },
  { type: 'building', x: 240, y: 1060, w: 100, h: 80, label: 'Deportes' },
  { type: 'building', x: 900, y: 1060, w: 130, h: 90, label: 'Residencia' },
  { type: 'building', x: 1100, y: 1060, w: 120, h: 80, label: 'Parqueo' },
  // Laterales izquierda
  { type: 'building', x: 40, y: 250, w: 110, h: 120, label: 'Oficinas' },
  { type: 'building', x: 40, y: 700, w: 110, h: 120, label: 'RRHH' },
  // Laterales derecha
  { type: 'building', x: 1450, y: 250, w: 110, h: 120, label: 'Ing. Sist.' },
  { type: 'building', x: 1450, y: 700, w: 110, h: 120, label: 'Posgrado' },
];

// ─── Árboles ──────────────────────────────────────────────────────────────────
export const WORLD_TREES: DecorItem[] = [
  // Hilera superior
  ...[320, 500, 680, 860, 1040, 1220].map((x, i) => ({
    type: 'tree' as const, x, y: 155, variant: i % 3,
  })),
  // Hilera inferior
  ...[320, 500, 680, 860, 1040, 1220].map((x, i) => ({
    type: 'tree' as const, x, y: 1040, variant: (i + 1) % 3,
  })),
  // Zona central izquierda (césped)
  { type: 'tree', x: 360, y: 380, variant: 0 },
  { type: 'tree', x: 420, y: 450, variant: 1 },
  { type: 'tree', x: 380, y: 520, variant: 2 },
  { type: 'tree', x: 460, y: 340, variant: 0 },
  { type: 'tree', x: 500, y: 500, variant: 1 },
  // Zona central derecha
  { type: 'tree', x: 900, y: 350, variant: 2 },
  { type: 'tree', x: 970, y: 430, variant: 0 },
  { type: 'tree', x: 1020, y: 330, variant: 1 },
  { type: 'tree', x: 1080, y: 480, variant: 2 },
  { type: 'tree', x: 850, y: 470, variant: 0 },
  // Zona inferior central
  { type: 'tree', x: 700, y: 850, variant: 1 },
  { type: 'tree', x: 760, y: 910, variant: 2 },
  { type: 'tree', x: 820, y: 860, variant: 0 },
  { type: 'tree', x: 660, y: 930, variant: 1 },
  // Lateral izquierda
  { type: 'tree', x: 100, y: 430, variant: 0 },
  { type: 'tree', x: 140, y: 500, variant: 2 },
  { type: 'tree', x: 100, y: 780, variant: 1 },
  { type: 'tree', x: 140, y: 850, variant: 0 },
  // Lateral derecha
  { type: 'tree', x: 1490, y: 430, variant: 2 },
  { type: 'tree', x: 1530, y: 510, variant: 0 },
  { type: 'tree', x: 1490, y: 780, variant: 1 },
  { type: 'tree', x: 1530, y: 850, variant: 2 },
];

// ─── Bancas y lámparas ────────────────────────────────────────────────────────
export const WORLD_FURNITURE: DecorItem[] = [
  // Bancas junto a camino principal
  { type: 'bench', x: 320, y: 560 },
  { type: 'bench', x: 500, y: 560 },
  { type: 'bench', x: 700, y: 560 },
  { type: 'bench', x: 900, y: 560 },
  { type: 'bench', x: 1100, y: 560 },
  { type: 'bench', x: 1280, y: 560 },
  // Lámparas
  { type: 'lamp', x: 260, y: 170 },
  { type: 'lamp', x: 430, y: 170 },
  { type: 'lamp', x: 730, y: 170 },
  { type: 'lamp', x: 1000, y: 170 },
  { type: 'lamp', x: 1300, y: 170 },
  { type: 'lamp', x: 260, y: 990 },
  { type: 'lamp', x: 700, y: 990 },
  { type: 'lamp', x: 1150, y: 990 },
  { type: 'lamp', x: 215, y: 320 },
  { type: 'lamp', x: 215, y: 700 },
  { type: 'lamp', x: 1365, y: 320 },
  { type: 'lamp', x: 1365, y: 700 },
  // Arbustos decorativos
  { type: 'bush', x: 330, y: 400 },
  { type: 'bush', x: 490, y: 440 },
  { type: 'bush', x: 870, y: 400 },
  { type: 'bush', x: 1060, y: 440 },
  { type: 'bush', x: 680, y: 860 },
  { type: 'bush', x: 780, y: 900 },
];

// ─── Draw functions ──────────────────────────────────────────────────────────

function drawGrassBase(ctx: CanvasRenderingContext2D, camX: number, camY: number, vpW: number, vpH: number) {
  // Base de césped
  ctx.fillStyle = C.grassBase;
  ctx.fillRect(0, 0, 1600, 1200);

  // Manchas de variación de color (césped más rico)
  const patches = [
    { x: 300, y: 300, r: 200 }, { x: 700, y: 400, r: 180 },
    { x: 900, y: 800, r: 160 }, { x: 400, y: 900, r: 190 },
    { x: 1100, y: 300, r: 170 }, { x: 1300, y: 800, r: 150 },
    { x: 600, y: 700, r: 140 }, { x: 1050, y: 650, r: 130 },
  ];

  for (const p of patches) {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, 'rgba(100, 170, 60, 0.25)');
    grad.addColorStop(1, 'rgba(100, 170, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(Math.max(0, p.x - p.r), Math.max(0, p.y - p.r), p.r * 2, p.r * 2);
  }

  // Patrón sutil de "cortes de césped" (rayas)
  ctx.strokeStyle = 'rgba(80, 140, 50, 0.12)';
  ctx.lineWidth = 16;
  for (let x = 0; x <= 1600; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1200);
    ctx.stroke();
  }

  // Borde del mundo
  ctx.strokeStyle = 'rgba(30, 80, 20, 0.6)';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 1600, 1200);
  ctx.strokeStyle = 'rgba(50, 110, 30, 0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 1592, 1192);
}

function drawPaths(ctx: CanvasRenderingContext2D) {
  for (const path of WORLD_PATHS) {
    // Sombra del camino
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(path.x + 3, path.y + 3, path.w, path.h);

    // Relleno del camino
    ctx.fillStyle = C.pathFill;
    ctx.fillRect(path.x, path.y, path.w, path.h);

    // Textura del pavimento (líneas sutiles)
    ctx.strokeStyle = C.pathLine;
    ctx.lineWidth = 1;
    const isHoriz = path.w > path.h;
    if (isHoriz) {
      for (let x = path.x; x < path.x + path.w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, path.y + 4);
        ctx.lineTo(x, path.y + path.h - 4);
        ctx.stroke();
      }
    } else {
      for (let y = path.y; y < path.y + path.h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(path.x + 4, y);
        ctx.lineTo(path.x + path.w - 4, y);
        ctx.stroke();
      }
    }

    // Borde del camino
    ctx.strokeStyle = C.pathEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(path.x, path.y, path.w, path.h);
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, item: DecorItem) {
  const { x, y, w = 100, h = 80, label } = item;
  const shadowOff = 6;

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + shadowOff, y + shadowOff, w, h);

  // Pared principal
  ctx.fillStyle = C.buildingWall;
  ctx.fillRect(x, y, w, h);

  // Techo (franja superior)
  ctx.fillStyle = C.buildingRoof;
  ctx.fillRect(x, y, w, 14);

  // Borde
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Ventanas
  const wCols = Math.max(1, Math.floor(w / 28));
  const wRows = Math.max(1, Math.floor((h - 20) / 22));
  const wW = 12, wH = 10;
  const xPad = (w - wCols * wW - (wCols - 1) * 8) / 2;
  const yPad = 18;

  for (let r = 0; r < wRows; r++) {
    for (let c = 0; c < wCols; c++) {
      const wx = x + xPad + c * (wW + 8);
      const wy = y + yPad + r * (wH + 8);
      if (wy + wH > y + h - 6) continue;
      ctx.fillStyle = C.buildingWindow;
      ctx.fillRect(wx, wy, wW, wH);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(wx, wy, wW, wH);
    }
  }

  // Puerta centrada
  const dW = 10, dH = 14;
  const dx = x + w / 2 - dW / 2;
  const dy = y + h - dH;
  ctx.fillStyle = C.buildingDoor;
  ctx.fillRect(dx, dy, dW, dH);

  // Etiqueta
  if (label) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = 'bold 9px "DM Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y - 4);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, item: DecorItem, time: number) {
  const { x, y, variant = 0 } = item;
  const r = 14 + variant * 2;
  const trunkW = 6, trunkH = 8;

  // Sombra del árbol
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 4, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tronco
  ctx.fillStyle = C.treeTrunk;
  ctx.fillRect(x - trunkW / 2, y - trunkH / 2, trunkW, trunkH);

  // Copa base (oscura)
  ctx.fillStyle = C.treeCanopyDark;
  ctx.beginPath();
  ctx.arc(x, y - 4, r, 0, Math.PI * 2);
  ctx.fill();

  // Copa principal
  const canopyColor = variant === 1 ? '#2e8b57' : variant === 2 ? '#228b22' : C.treeCanopy;
  ctx.fillStyle = canopyColor;
  ctx.beginPath();
  ctx.arc(x - 2, y - 6, r - 2, 0, Math.PI * 2);
  ctx.fill();

  // Brillo (destello superior)
  ctx.fillStyle = C.treeCanopyLight;
  ctx.beginPath();
  ctx.arc(x - 3, y - 8, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Punto de luz especular
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 10, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx: CanvasRenderingContext2D, item: DecorItem) {
  const { x, y } = item;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.bushDark;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 8, y + 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 7, y + 2, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.bushGreen;
  ctx.beginPath();
  ctx.arc(x, y - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 7, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 6, y, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(100,200,60,0.3)';
  ctx.beginPath();
  ctx.arc(x - 2, y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBench(ctx: CanvasRenderingContext2D, item: DecorItem) {
  const { x, y } = item;
  // Patas
  ctx.fillStyle = C.benchMetal;
  ctx.fillRect(x - 12, y - 2, 3, 8);
  ctx.fillRect(x + 9, y - 2, 3, 8);
  // Asiento
  ctx.fillStyle = C.benchWood;
  ctx.fillRect(x - 14, y - 5, 28, 5);
  // Respaldo
  ctx.fillStyle = C.benchWood;
  ctx.fillRect(x - 14, y - 12, 28, 4);
  // Lineas de madera
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  for (let i = -8; i <= 8; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x + i, y - 5);
    ctx.lineTo(x + i, y);
    ctx.stroke();
  }
}

function drawLamp(ctx: CanvasRenderingContext2D, item: DecorItem, time: number) {
  const { x, y } = item;
  const glow = 0.45 + 0.1 * Math.sin(time / 1800);

  // Halo de luz
  const grad = ctx.createRadialGradient(x, y - 22, 0, x, y - 22, 30);
  grad.addColorStop(0, `rgba(255, 240, 160, ${glow})`);
  grad.addColorStop(1, 'rgba(255, 240, 160, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y - 22, 30, 0, Math.PI * 2);
  ctx.fill();

  // Poste
  ctx.strokeStyle = C.lampPost;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 20);
  ctx.lineTo(x + 6, y - 24);
  ctx.stroke();

  // Cabezal
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(x + 6, y - 24, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 245, 200, ${0.85 + glow * 0.15})`;
  ctx.beginPath();
  ctx.arc(x + 6, y - 24, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Base
  ctx.fillStyle = '#666';
  ctx.fillRect(x - 3, y - 2, 6, 4);
}

// ─── Función principal de exportación ────────────────────────────────────────

export function drawWorldDecor(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vpW: number,
  vpH: number,
  time: number,
): void {
  drawGrassBase(ctx, camX, camY, vpW, vpH);
  drawPaths(ctx);

  for (const b of WORLD_BUILDINGS) drawBuilding(ctx, b);
  for (const f of WORLD_FURNITURE) {
    if (f.type === 'bench') drawBench(ctx, f);
    else if (f.type === 'lamp') drawLamp(ctx, f, time);
    else if (f.type === 'bush') drawBush(ctx, f);
  }
  for (const t of WORLD_TREES) drawTree(ctx, t, time);
}

/**
 * Minimap zone definitions.
 * All coordinates are in WORLD space (1600 × 1200).
 *
 * To add a new attraction in the future, just push a new entry here —
 * the Minimap component will pick it up automatically.
 */

export interface MinimapZone {
  id: string;
  label: string;
  /** World-space centre X */
  x: number;
  /** World-space centre Y */
  y: number;
  /** Approximate radius in world units (used to draw the zone circle) */
  radius: number;
  /** Emoji icon rendered on the minimap dot */
  icon: string;
  /** Tailwind / CSS colour for the zone marker */
  color: string;
}

// The duel pads sit around x≈355–500, y≈460 on the original 800×600 canvas.
// The world is 1600×1200 (2× scale), so we keep the same coords since PAD_AREAS
// uses the original 800×600 space and the world canvas is also 1600×1200 but
// the pads are drawn at their original positions (no scaling applied in VirtualWorld).
export const MINIMAP_ZONES: MinimapZone[] = [
  {
    id: 'football',
    label: 'Fútbol 1v1',
    x: 800,
    y: 600,
    radius: 70,
    icon: '⚽',
    color: '#27ae60',
  },
  {
    id: 'shooter',
    label: 'Arena Shooter',
    x: 1275,
    y: 615,
    radius: 70,
    icon: '🎯',
    color: '#e74c3c',
  },
];

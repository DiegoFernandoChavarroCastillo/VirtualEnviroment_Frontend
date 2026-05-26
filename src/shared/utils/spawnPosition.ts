/**
 * Generates a random spawn position on the virtual world map (1600×1200)
 * that avoids all game zones (football pads and shooter zone).
 */

import { secureRandom } from './secureRandom';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const AVATAR_RADIUS = 20;
const MARGIN = 60; // extra clearance around each zone

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// All zones that should be avoided on spawn
const BLOCKED_ZONES: Rect[] = [
  // Football pad-a
  { x: 620 - MARGIN, y: 540 - MARGIN, width: 120 + MARGIN * 2, height: 120 + MARGIN * 2 },
  // Football pad-b
  { x: 760 - MARGIN, y: 540 - MARGIN, width: 120 + MARGIN * 2, height: 120 + MARGIN * 2 },
  // Shooter zone
  { x: 1200 - MARGIN, y: 540 - MARGIN, width: 150 + MARGIN * 2, height: 150 + MARGIN * 2 },
];

function isInsideBlockedZone(x: number, y: number): boolean {
  return BLOCKED_ZONES.some(
    (z) => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height,
  );
}

/**
 * Returns a random (x, y) position that is:
 * - Within the world bounds (with avatar margin)
 * - Not overlapping any game zone
 *
 * Falls back to a safe hardcoded position if no valid spot is found
 * after 50 attempts (should never happen in practice).
 */
export function getRandomSpawnPosition(): { x: number; y: number } {
  const minX = AVATAR_RADIUS + 50;
  const maxX = WORLD_WIDTH - AVATAR_RADIUS - 50;
  const minY = AVATAR_RADIUS + 50;
  const maxY = WORLD_HEIGHT - AVATAR_RADIUS - 50;

  for (let attempt = 0; attempt < 50; attempt++) {
    const x = Math.floor(secureRandom() * (maxX - minX) + minX);
    const y = Math.floor(secureRandom() * (maxY - minY) + minY);
    if (!isInsideBlockedZone(x, y)) {
      return { x, y };
    }
  }

  // Safe fallback: top-left quadrant, well away from all zones
  return { x: 300, y: 300 };
}

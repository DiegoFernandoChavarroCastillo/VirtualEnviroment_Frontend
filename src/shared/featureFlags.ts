/**
 * Frontend feature flags.
 *
 * Each flag is read once at module load time. To change a flag, update the
 * corresponding `VITE_*` variable in `.env` and restart the dev server (or
 * rebuild) — Vite inlines these at build time.
 */

/**
 * `VITE_FOOTBALL_DUEL_ENABLED=true`  → football-duel is active
 * `VITE_FOOTBALL_DUEL_ENABLED=false` → football-duel is disabled (default).
 *
 * The project is currently focused on shooter-arena, so football-duel ships
 * disabled by default. To re-enable the minigame, set
 * `VITE_FOOTBALL_DUEL_ENABLED=true` in `.env` and restart the dev server.
 *
 * When disabled, the football socket listeners, pad drawing, crown drawing
 * and `FootballDuelMatch` overlay are all skipped. The `football-duel`
 * source files stay on disk for easy re-enable.
 */
export const FOOTBALL_DUEL_ENABLED: boolean =
  (import.meta.env.VITE_FOOTBALL_DUEL_ENABLED ?? 'false').toLowerCase() === 'true';

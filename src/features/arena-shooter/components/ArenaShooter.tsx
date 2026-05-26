import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useShooterSocket } from '../hooks/useShooterSocket';
import { useShooterSnapshot } from '../hooks/useShooterSnapshot';
import { useShooterPhysics } from '../hooks/useShooterPhysics';
import { ParticleSystem } from '../utils/ParticleSystem';
import { secureRandom, generateSecureId } from '@/shared/utils/secureRandom';
import styles from '../styles/ArenaShooter.module.css';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_RADIUS,
  PROJECTILE_RADIUS,
  CoverStructure,
  ShooterPlayerInfo,
  ShooterSnapshot,
  PlayerHitPayload,
  PlayerEliminatedPayload,
  PlayerLeftPayload,
  ReturnPayload,
} from '../types/arena-shooter.types';
import { getRandomSpawnPosition } from '@/shared/utils/spawnPosition';

interface ArenaShooterProps {
  roomId: string;
  localPlayer: { userId: string; name: string };
  initialPlayers: ShooterPlayerInfo[];
  onReturn: (spawnX: number, spawnY: number) => void;
}

interface HudNotification {
  id: string;
  text: string;
  type?: 'default' | 'kill' | 'eliminated';
}

export const ArenaShooter: React.FC<ArenaShooterProps> = ({
  roomId,
  localPlayer,
  initialPlayers,
  onReturn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [notifications, setNotifications] = useState<HudNotification[]>([]);
  const [showEliminated, setShowEliminated] = useState(false);
  const [showLastStanding, setShowLastStanding] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [isHit, setIsHit] = useState(false);
  
  const particleSystemRef = useRef(new ParticleSystem());
  const screenShakeRef = useRef(0);
  const structuresRef = useRef<CoverStructure[]>([]);
  // Viewport (cÃ¡mara) â€” sigue al jugador local
  const cameraRef = useRef({ x: 0, y: 0 });
  // TamaÃ±o del canvas visible (viewport fijo 800Ã—600)
  const VIEWPORT_W = 800;
  const VIEWPORT_H = 600;

  const { pushSnapshot, getInterpolatedPlayer, getInterpolatedProjectiles, getLatestPlayers } =
    useShooterSnapshot();

  const { getLocalPlayerPos, getLastDirection, applyInput, stepPhysics, reconcile } = useShooterPhysics({
    initialX: ARENA_WIDTH / 2,
    initialY: ARENA_HEIGHT / 2,
    structuresRef,
  });

  const [localStats, setLocalStats] = useState<ShooterPlayerInfo>({
    userId: localPlayer.userId,
    name: localPlayer.name,
    lives: 3,
    kills: 0,
    deaths: 0,
  });
  const [leaderboard, setLeaderboard] = useState<ShooterPlayerInfo[]>([]);

  useEffect(() => {
    console.log(`[ArenaShooter] Player joined: ${localPlayer.name}`);
    setLeaderboard(initialPlayers);
    const found = initialPlayers.find(p => p.userId === localPlayer.userId);
    if (found) setLocalStats(found);
  }, [initialPlayers, localPlayer.userId, localPlayer.name]);

  const addNotification = useCallback((text: string, duration = 3000, type: HudNotification['type'] = 'default') => {
    const id = generateSecureId(9);
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const triggerShake = (magnitude: number) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, magnitude);
  };

  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const handlePlayerLeft = useCallback((p: PlayerLeftPayload) => {
    setLeaderboard(prev => prev.filter(pl => pl.userId !== p.userId));
    const leaving = leaderboard.find(l => l.userId === p.userId);
    if (leaving) addNotification(`${leaving.name} saliÃ³ del juego`, 2000);
  }, [leaderboard, addNotification]);

  const handleRoomState = useCallback((payload: { players: ShooterPlayerInfo[]; structures?: CoverStructure[]; activePlayers: number }) => {
    setLeaderboard(payload.players);
    const me = payload.players.find(p => p.userId === localPlayer.userId);
    if (me) setLocalStats(me);
    if (payload.structures && payload.structures.length > 0) {
      structuresRef.current = payload.structures;
    }
  }, [localPlayer.userId]);

  const handleSnapshot = useCallback((snapshot: ShooterSnapshot) => {
    pushSnapshot(snapshot);

    // Guardar estructuras si vienen en el snapshot (solo tick 1)
    if (snapshot.structures && snapshot.structures.length > 0) {
      structuresRef.current = snapshot.structures;
    }
    
    // Update leaderboard with latest player stats from snapshot (throttled to avoid excessive re-renders)
    // Only update every 10 ticks (~333ms at 30 ticks/sec)
    if (snapshot.tick % 10 === 0) {
      const playerInfos: ShooterPlayerInfo[] = snapshot.players.map(p => ({
        userId: p.userId,
        name: p.name,
        lives: p.lives,
        kills: p.kills,
        deaths: p.deaths,
      }));
      setLeaderboard(playerInfos);
    }
    
    // Update local player stats only if they changed
    const serverPlayer = snapshot.players.find(p => p.userId === localPlayer.userId);
    if (serverPlayer) {
      reconcile({ x: serverPlayer.x, y: serverPlayer.y }, snapshot.tick);
      
      setLocalStats(prev => {
        // Only update if values actually changed
        if (prev.lives !== serverPlayer.lives || 
            prev.kills !== serverPlayer.kills || 
            prev.deaths !== serverPlayer.deaths) {
          return {
            userId: serverPlayer.userId,
            name: serverPlayer.name,
            lives: serverPlayer.lives,
            kills: serverPlayer.kills,
            deaths: serverPlayer.deaths,
          };
        }
        return prev;
      });
    }
    
    // Add projectile trails
    snapshot.projectiles.forEach(proj => {
      particleSystemRef.current.add({
        x: proj.x, y: proj.y, vx: 0, vy: 0,
        life: 10, color: 'rgba(231, 76, 60, 0.3)', size: 4, type: 'trail'
      });
    });
  }, [localPlayer.userId, pushSnapshot, reconcile]);

  const handlePlayerHit = useCallback((p: PlayerHitPayload) => {
    // Update local stats immediately if we were hit
    if (p.victimId === localPlayer.userId) {
      setIsHit(true);
      setTimeout(() => setIsHit(false), 200);
      triggerShake(8);
      addNotification("Â¡Te han dado!", 1500, 'default');
      setLocalStats(prev => ({ ...prev, lives: p.livesRemaining }));
    }
    
    // Update leaderboard for the victim
    setLeaderboard(prev => prev.map(pl => 
      pl.userId === p.victimId 
        ? { ...pl, lives: p.livesRemaining }
        : pl
    ));
    
    const victimPos = p.victimId === localPlayer.userId 
      ? getLocalPlayerPos() 
      : getInterpolatedPlayer(p.victimId, Date.now());
    particleSystemRef.current.emitExplosion(victimPos.x, victimPos.y, '#e67e22', 12);
  }, [localPlayer.userId, addNotification, getInterpolatedPlayer, getLocalPlayerPos]);

  const handlePlayerEliminated = useCallback((p: PlayerEliminatedPayload) => {
    if (p.eliminatedId === localPlayer.userId) {
      setShowEliminated(true);
      triggerShake(15);
    }
    
    // Update killer's kills count
    if (p.killerId === localPlayer.userId) {
      setLocalStats(prev => ({ ...prev, kills: prev.kills + 1 }));
    }
    
    // Update leaderboard: increment killer's kills and remove eliminated player
    setLeaderboard(prev => {
      const updated = prev.map(pl => 
        pl.userId === p.killerId 
          ? { ...pl, kills: pl.kills + 1 }
          : pl
      );
      return updated.filter(pl => pl.userId !== p.eliminatedId);
    });

    const killer = leaderboard.find(pl => pl.userId === p.killerId);
    const victim = leaderboard.find(pl => pl.userId === p.eliminatedId);
    if (killer && victim) {
      addNotification(`${killer.name} eliminÃ³ a ${victim.name}`, 3000, 'kill');
      const victimPos = getInterpolatedPlayer(p.eliminatedId, Date.now());
      particleSystemRef.current.emitExplosion(victimPos.x, victimPos.y, '#e74c3c', 30);
    }
  }, [localPlayer.userId, leaderboard, addNotification, getInterpolatedPlayer]);

  const handleLastPlayerStanding = useCallback((p: { userId: string }) => {
    const winner = leaderboard.find(pl => pl.userId === p.userId);
    if (winner) {
      setWinnerName(winner.name);
      setShowLastStanding(true);
      if (p.userId === localPlayer.userId) {
        confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
      }
    }
  }, [leaderboard, localPlayer.userId]);

  const handleReturnToVirtualWorld = useCallback((payload: ReturnPayload) => {
    onReturn(payload.spawnX, payload.spawnY);
  }, [onReturn]);

  const { emitPlayerInput, isConnected } = useShooterSocket({
    roomId,
    playerName: localPlayer.name,
    onSnapshot: handleSnapshot,
    onRoomState: handleRoomState,
    onPlayerHit: handlePlayerHit,
    onPlayerEliminated: handlePlayerEliminated,
    onPlayerLeft: handlePlayerLeft,
    onLastPlayerStanding: handleLastPlayerStanding,
    onReturnToVirtualWorld: handleReturnToVirtualWorld,
  });

  useEffect(() => {
    if (isConnected && leaderboard.length === 0) {
      const timer = setTimeout(() => {
        // Request room state if leaderboard is still empty
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, leaderboard.length]);

  const [mobileMove, setMobileMove] = useState({ dx: 0, dy: 0 });
  const shootPendingMobile = useRef(false);

  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const handleDown = (e: KeyboardEvent) => { keys[e.key] = true; keys[e.key.toLowerCase()] = true; };
    const handleUp = (e: KeyboardEvent) => { keys[e.key] = false; keys[e.key.toLowerCase()] = false; };
    const mouseAim = { x: 0, y: 0 };
    let isMouseDown = false;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseAim.x = e.clientX - rect.left;
      mouseAim.y = e.clientY - rect.top;
    };
    const handleMouseDown = () => { isMouseDown = true; };
    const handleMouseUp = () => { isMouseDown = false; };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let lastShootTime = 0;
    let lastMoveEmitTime = 0;
    let lastDx = 0;
    let lastDy = 0;

    const loop = () => {
      const now = Date.now();
      
      let dx = 0; let dy = 0;
      if (isMobileDevice) {
        dx = mobileMove.dx;
        dy = mobileMove.dy;
      } else {
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;
      }

      applyInput({ action: 'move', dx, dy });

      if (dx !== lastDx || dy !== lastDy || now - lastMoveEmitTime > 100) {
        emitPlayerInput({ action: 'move', dx, dy });
        lastMoveEmitTime = now;
        lastDx = dx;
        lastDy = dy;
      }

      const wantsToShoot = keys[' '] || keys['enter'] || isMouseDown || shootPendingMobile.current;
      if (wantsToShoot && now - lastShootTime > 300) {
        const localPos = getLocalPlayerPos();
        let aimDx = 0; let aimDy = 0;

        if (!isMobileDevice && (mouseAim.x !== 0 || mouseAim.y !== 0)) {
          // Convertir coords de viewport â†’ coords de mundo sumando el offset de cÃ¡mara
          const cam = cameraRef.current;
          const worldMouseX = mouseAim.x + cam.x;
          const worldMouseY = mouseAim.y + cam.y;
          const adx = worldMouseX - localPos.x;
          const ady = worldMouseY - localPos.y;
          const mag = Math.sqrt(adx * adx + ady * ady);
          if (mag > 0) { aimDx = adx/mag; aimDy = ady/mag; }
        } else {
          const dir = getLastDirection();
          aimDx = dir.x; aimDy = dir.y;
        }

        emitPlayerInput({ action: 'shoot', aimDx, aimDy });
        const angle = Math.atan2(aimDy, aimDx);
        particleSystemRef.current.emitMuzzleFlash(localPos.x + aimDx * 25, localPos.y + aimDy * 25, angle);
        triggerShake(3);
        lastShootTime = now;
        shootPendingMobile.current = false;
      }

      stepPhysics();
      particleSystemRef.current.update();
      if (screenShakeRef.current > 0) {
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.1) screenShakeRef.current = 0;
      }

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyInput, emitPlayerInput, stepPhysics, getLocalPlayerPos, getLastDirection, isMobileDevice, mobileMove]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const localPos = getLocalPlayerPos();

    // â”€â”€ Actualizar cÃ¡mara (centrada en el jugador, clampeada al mapa) â”€â”€â”€â”€â”€â”€
    const camX = Math.max(0, Math.min(ARENA_WIDTH - VIEWPORT_W, localPos.x - VIEWPORT_W / 2));
    const camY = Math.max(0, Math.min(ARENA_HEIGHT - VIEWPORT_H, localPos.y - VIEWPORT_H / 2));
    cameraRef.current = { x: camX, y: camY };

    ctx.save();

    // Screen shake
    if (screenShakeRef.current > 0) {
      ctx.translate(
        (secureRandom() - 0.5) * screenShakeRef.current,
        (secureRandom() - 0.5) * screenShakeRef.current,
      );
    }

    // Aplicar transformaciÃ³n de cÃ¡mara
    ctx.translate(-camX, -camY);

    // â”€â”€ Fondo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ctx.fillStyle = '#111122';
    ctx.fillRect(camX, camY, VIEWPORT_W, VIEWPORT_H);

    // Grid (solo en el viewport visible)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridStart = { x: Math.floor(camX / 40) * 40, y: Math.floor(camY / 40) * 40 };
    for (let x = gridStart.x; x < camX + VIEWPORT_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, camY); ctx.lineTo(x, camY + VIEWPORT_H); ctx.stroke();
    }
    for (let y = gridStart.y; y < camY + VIEWPORT_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(camX, y); ctx.lineTo(camX + VIEWPORT_W, y); ctx.stroke();
    }

    // â”€â”€ Estructuras de cobertura â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const structures = structuresRef.current;
    for (const s of structures) {
      // Solo dibujar si estÃ¡ en el viewport
      if (
        s.x + s.width < camX || s.x > camX + VIEWPORT_W ||
        s.y + s.height < camY || s.y > camY + VIEWPORT_H
      ) continue;

      // Sombra
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';

      // Cuerpo de la estructura
      ctx.fillStyle = '#3d4a5c';
      ctx.fillRect(s.x, s.y, s.width, s.height);

      // Borde
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#5a6a7e';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.width, s.height);

      // Detalle interior (lÃ­nea diagonal para dar sensaciÃ³n de caja/pared)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + 4, s.y + 4);
      ctx.lineTo(s.x + s.width - 4, s.y + s.height - 4);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    const now = Date.now();

    // â”€â”€ Proyectiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const projectiles = getInterpolatedProjectiles(now);
    projectiles.forEach(proj => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4757';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff4757';
      ctx.fill();
      ctx.restore();
    });

    // â”€â”€ PartÃ­culas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    particleSystemRef.current.draw(ctx);

    // â”€â”€ Jugadores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const latestPlayers = getLatestPlayers();
    latestPlayers.forEach(p => {
      const isLocal = p.userId === localPlayer.userId;
      const pos = isLocal ? localPos : getInterpolatedPlayer(p.userId, now);
      drawPlayer(ctx, pos.x, pos.y, p.name, isLocal);
    });

    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string, isLocal: boolean) => {
    ctx.save();
    
    // Draw player circle
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isLocal ? '#f1c40f' : '#2980b9';
    ctx.shadowBlur = 15;
    ctx.shadowColor = isLocal ? '#f1c40f' : '#3498db';
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Draw name
    const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText(displayName, x, y - PLAYER_RADIUS - 10);
    
    ctx.restore();
  };

  return (
    <div className={styles.arenaOverlay} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={`${styles.hitVignette} ${isHit ? styles.active : ''}`} />
      
      <div style={{ position: 'relative', maxWidth: '100%', padding: '0 10px' }}>
          <canvas
            ref={canvasRef}
            width={VIEWPORT_W}
            height={VIEWPORT_H}
            style={{ 
              borderRadius: '12px', 
              boxShadow: '0 0 50px rgba(0,0,0,0.5)', 
              background: '#000',
              maxWidth: '100%',
              height: 'auto',
              display: 'block'
            }}
          />

          {/* Exit button */}
          <button
            type="button"
            onClick={() => { const { x, y } = getRandomSpawnPosition(); onReturn(x, y); }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '20px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget;
              btn.style.background = 'rgba(220,38,38,0.8)';
              btn.style.color = '#fff';
              btn.style.borderColor = 'rgba(248,113,113,0.6)';
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget;
              btn.style.background = 'rgba(0,0,0,0.6)';
              btn.style.color = 'rgba(255,255,255,0.7)';
              btn.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            aria-label="Abandonar arena y regresar al mapa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>

          <div className={styles.killFeed}>
            <AnimatePresence>
              {notifications.map(n => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={styles.killEntry}
                >
                  {n.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className={`${styles.leaderboard} ${styles.glassPanel}`}>
            <h3 style={{ fontSize: '11px', marginBottom: '6px', opacity: 0.5, letterSpacing: '2px', textAlign: 'center' }}>SCOREBOARD</h3>
            {leaderboard.sort((a,b) => b.kills - a.kills).slice(0, 6).map(p => (
              <div key={p.userId} className={`${styles.leaderboardEntry} ${p.userId === localPlayer.userId ? styles.active : ''}`}>
                <span title={p.name}>{p.name}</span>
                <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{p.kills} K</span>
              </div>
            ))}
          </div>

          <div className={styles.statsHUD}>
            <div className={styles.statItem}>
              <span className={styles.statValue} style={{ color: '#e74c3c' }}>{localStats.lives}</span>
              <span className={styles.statLabel}>Vidas</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{localStats.kills}</span>
              <span className={styles.statLabel}>Kills</span>
            </div>
          </div>

          {isMobileDevice && (
            <>
              <div style={{ position: 'fixed', bottom: '40px', left: '40px', zIndex: 100 }}>
                <DuelJoystick onMove={(dx, dy) => setMobileMove({ dx, dy })} />
              </div>
              <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 100 }}>
                 <button 
                   onTouchStart={(e) => { e.preventDefault(); shootPendingMobile.current = true; }}
                   style={{
                     width: '80px', height: '80px', borderRadius: '50%',
                     background: 'rgba(231, 76, 60, 0.8)', border: '4px solid #fff',
                     color: '#fff', fontSize: '14px', fontWeight: 'bold',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                   }}
                 >
                   FUEGO
                 </button>
              </div>
            </>
          )}
      </div>

      <AnimatePresence>
        {showEliminated && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }}
            className={styles.gameOverOverlay}
          >
            <h1 style={{ fontSize: '64px', color: '#e74c3c', margin: 0 }}>HAS CAÃDO</h1>
            <p style={{ opacity: 0.7 }}>Fuiste derrotado en la arena.</p>
            <button className={styles.returnButton} onClick={() => { const { x, y } = getRandomSpawnPosition(); onReturn(x, y); }}>VOLVER AL MAPA</button>
          </motion.div>
        )}

        {showLastStanding && winnerName === localPlayer.name && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }}
            className={styles.gameOverOverlay}
          >
            <h1 style={{ fontSize: '64px', margin: 0 }}>ðŸ† Â¡VICTORIA!</h1>
            <p style={{ opacity: 0.7 }}>Eres el Ãºltimo sobreviviente.</p>
            <button className={styles.returnButton} onClick={() => { const { x, y } = getRandomSpawnPosition(); onReturn(x, y); }}>REGRESAR COMO HÃ‰ROE</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const JOY_RADIUS = 56;
const JOY_KNOB = 24;

const DuelJoystick: React.FC<{ onMove: (dx: number, dy: number) => void }> = ({ onMove }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  const calc = (cx: number, cy: number, clientX: number, clientY: number) => {
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const max = JOY_RADIUS - JOY_KNOB;
    const clamped = Math.min(dist, max);
    const angle = Math.atan2(rawDy, rawDx);
    return {
      dx: dist > 0 ? (Math.cos(angle) * clamped) / max : 0,
      dy: dist > 0 ? (Math.sin(angle) * clamped) / max : 0,
      kx: Math.cos(angle) * clamped,
      ky: Math.sin(angle) * clamped,
    };
  };

  const setKnob = (kx: number, ky: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeId.current !== null) return;
    const t = e.changedTouches[0];
    activeId.current = t.identifier;
    const rect = baseRef.current!.getBoundingClientRect();
    const { dx, dy, kx, ky } = calc(rect.left + rect.width / 2, rect.top + rect.height / 2, t.clientX, t.clientY);
    setKnob(kx, ky); onMove(dx, dy);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = Array.from(e.changedTouches).find(x => x.identifier === activeId.current);
    if (!t) return;
    e.preventDefault();
    const rect = baseRef.current!.getBoundingClientRect();
    const { dx, dy, kx, ky } = calc(rect.left + rect.width / 2, rect.top + rect.height / 2, t.clientX, t.clientY);
    setKnob(kx, ky); onMove(dx, dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!Array.from(e.changedTouches).find(x => x.identifier === activeId.current)) return;
    activeId.current = null;
    setKnob(0, 0); onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      style={{ width: JOY_RADIUS * 2, height: JOY_RADIUS * 2, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)', position: 'relative', touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: JOY_KNOB * 2, height: JOY_KNOB * 2, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default ArenaShooter;

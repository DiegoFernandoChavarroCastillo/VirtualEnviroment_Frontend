import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useShooterSocket } from '../hooks/useShooterSocket';
import { useShooterSnapshot } from '../hooks/useShooterSnapshot';
import { useShooterPhysics } from '../hooks/useShooterPhysics';
import { useWeaponPickups } from '../hooks/useWeaponPickups';
import { useArenaSound } from '../hooks/useArenaSound';
import { ParticleSystem } from '../utils/ParticleSystem';
import { secureRandom, generateSecureId } from '@/shared/utils/secureRandom';
import { Sbed, Lorc, Delapouite } from '@/shared/icons/gameIcons';
import styles from '../styles/ArenaShooter.module.css';
import {
  CoverStructure,
  ShooterPlayerInfo,
  ShooterSnapshot,
  PlayerHitPayload,
  PlayerEliminatedPayload,
  PlayerLeftPayload,
  ReturnPayload,
  RocketExplosionPayload,
  ShieldAbsorbedPayload,
  WeaponType,
  ArenaConfig,
  PickupBox,
  PickupCollectedPayload,
} from '../types/arena-shooter.types';
import { getRandomSpawnPosition } from '@/shared/utils/spawnPosition';
import { VirtualJoystick } from '@/shared/components/VirtualJoystick';
import { getGameConfig } from '../utils/gameConfigStore';

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
  // Camera — follows local player
  const cameraRef = useRef({ x: 0, y: 0 });
  // Fixed viewport 800×600
  const VIEWPORT_W = 800;
  const VIEWPORT_H = 600;

  const configRef = useRef<ArenaConfig | null>(null);
  const cfg = getGameConfig();
  if (cfg) configRef.current = cfg.arenaConfig;
  const arenaConfig = configRef.current;
  const arenaW = arenaConfig?.arena.width ?? 1600;
  const arenaH = arenaConfig?.arena.height ?? 1200;
  const playerRadius = arenaConfig?.player.radius ?? 20;
  const projectileRadius = arenaConfig?.projectile.radius ?? 6;

  const { pushSnapshot, getInterpolatedPlayer, getInterpolatedProjectiles, getLatestPlayers } =
    useShooterSnapshot();

  const { getLocalPlayerPos, getLastDirection, applyInput, stepPhysics, reconcile } = useShooterPhysics({
    initialX: arenaW / 2,
    initialY: arenaH / 2,
    structuresRef,
  });

  const { checkPickupCollision, drawPickups, consumeAmmo, getActiveWeapon, setWeapon } = useWeaponPickups();
  const [hudWeapon, setHudWeapon] = useState<{ type: WeaponType; ammo: number }>({ type: 'normal', ammo: 0 });
  const lastHudWeaponRef = useRef<{ type: WeaponType; ammo: number }>({ type: 'normal', ammo: 0 });
  const [serverPickups, setServerPickups] = useState<PickupBox[]>([]);
  const serverPickupsRef = useRef<PickupBox[]>([]);

  const { playShoot, playLaser, playRocket, playExplosion, playItemCollected } = useArenaSound();

  const [localStats, setLocalStats] = useState<ShooterPlayerInfo>({
    userId: localPlayer.userId,
    name: localPlayer.name,
    health: 100,
    shield: 0,
    kills: 0,
    deaths: 0,
  });
  const [leaderboard, setLeaderboard] = useState<ShooterPlayerInfo[]>([]);

  useEffect(() => {
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

  // ── Detección de móvil (solo userAgent — evita falsos positivos en laptops táctiles) ──
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(mobileUA);
  }, []);

  useEffect(() => {
    if (!isMobileDevice) return;
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobileDevice]);

  const handlePlayerLeft = useCallback((p: PlayerLeftPayload) => {
    setLeaderboard(prev => prev.filter(pl => pl.userId !== p.userId));
    const leaving = leaderboard.find(l => l.userId === p.userId);
    if (leaving) addNotification(`${leaving.name} salió del juego`, 2000);
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

    if (snapshot.structures && snapshot.structures.length > 0) {
      structuresRef.current = snapshot.structures;
    }

    if (snapshot.tick % 10 === 0) {
      const playerInfos: ShooterPlayerInfo[] = snapshot.players.map(p => ({
        userId: p.userId,
        name: p.name,
        health: p.health,
        shield: p.shield,
        kills: p.kills,
        deaths: p.deaths,
      }));
      setLeaderboard(playerInfos);
    }

    const serverPlayer = snapshot.players.find(p => p.userId === localPlayer.userId);
    if (serverPlayer) {
      reconcile({ x: serverPlayer.x, y: serverPlayer.y }, snapshot.tick);
      setLocalStats(prev => {
        if (prev.health !== serverPlayer.health ||
            prev.shield !== serverPlayer.shield ||
            prev.kills !== serverPlayer.kills ||
            prev.deaths !== serverPlayer.deaths) {
          return {
            userId: serverPlayer.userId,
            name: serverPlayer.name,
            health: serverPlayer.health,
            shield: serverPlayer.shield,
            kills: serverPlayer.kills,
            deaths: serverPlayer.deaths,
          };
        }
        return prev;
      });
    }

    snapshot.projectiles.forEach(proj => {
      const isRocket = proj.weaponType === 'rocket';
      const isShotgun = proj.weaponType === 'shotgun';
      particleSystemRef.current.add({
        x: proj.x, y: proj.y, vx: 0, vy: 0,
        life: isRocket ? 25 : 10,
        color: isRocket
          ? 'rgba(200, 200, 200, 0.4)'
          : (isShotgun ? 'rgba(243, 156, 18, 0.4)' : 'rgba(231, 76, 60, 0.3)'),
        size: isRocket ? 6 : 4,
        type: isRocket ? 'smoke' : 'trail',
      });
    });
  }, [localPlayer.userId, pushSnapshot, reconcile]);

  const handlePlayerHit = useCallback((p: PlayerHitPayload) => {
    if (p.victimId === localPlayer.userId) {
      setIsHit(true);
      setTimeout(() => setIsHit(false), 200);
      triggerShake(8);
      addNotification('¡Te han dado!', 1500, 'default');
      setLocalStats(prev => ({ ...prev, health: p.healthRemaining }));
    }
    setLeaderboard(prev => prev.map(pl =>
      pl.userId === p.victimId ? { ...pl, health: p.healthRemaining } : pl
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
    if (p.killerId === localPlayer.userId) {
      setLocalStats(prev => ({ ...prev, kills: prev.kills + 1 }));
    }
    setLeaderboard(prev => {
      const updated = prev.map(pl =>
        pl.userId === p.killerId ? { ...pl, kills: pl.kills + 1 } : pl
      );
      return updated.filter(pl => pl.userId !== p.eliminatedId);
    });
    const killer = leaderboard.find(pl => pl.userId === p.killerId);
    const victim = leaderboard.find(pl => pl.userId === p.eliminatedId);
    if (killer && victim) {
      addNotification(`${killer.name} eliminó a ${victim.name}`, 3000, 'kill');
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

  const handleRocketExplosion = useCallback((p: RocketExplosionPayload) => {
    triggerShake(12);
    particleSystemRef.current.emitRocketExplosion(p.x, p.y, p.radius);
    playExplosion();
  }, [playExplosion]);

  const handleShieldAbsorbed = useCallback((p: ShieldAbsorbedPayload) => {
    if (p.victimId === localPlayer.userId) {
      triggerShake(6);
      addNotification('¡Escudo absorbió el golpe!', 2000, 'default');
    }
    const victimPos = p.victimId === localPlayer.userId
      ? getLocalPlayerPos()
      : getInterpolatedPlayer(p.victimId, Date.now());
    particleSystemRef.current.emitExplosion(victimPos.x, victimPos.y, '#3498db', 20);
  }, [localPlayer.userId, addNotification, getInterpolatedPlayer, getLocalPlayerPos]);

  const { emitPlayerInput, emitCollectItem, isConnected } = useShooterSocket({
    roomId,
    playerName: localPlayer.name,
    onSnapshot: handleSnapshot,
    onRoomState: handleRoomState,
    onPlayerHit: handlePlayerHit,
    onPlayerEliminated: handlePlayerEliminated,
    onPlayerLeft: handlePlayerLeft,
    onLastPlayerStanding: handleLastPlayerStanding,
    onReturnToVirtualWorld: handleReturnToVirtualWorld,
    onRocketExplosion: handleRocketExplosion,
    onShieldAbsorbed: handleShieldAbsorbed,
    onPickupState: (pickups) => { setServerPickups(pickups); serverPickupsRef.current = pickups; },
    onPickupCollected: (payload) => {
      setServerPickups(prev => {
        const next = prev.filter(b => b.x !== payload.x || b.y !== payload.y);
        serverPickupsRef.current = next;
        return next;
      });
    },
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

    let lastMoveEmitTime = 0;
    let lastDx = 0;
    let lastDy = 0;

    const loop = () => {
      const now = Date.now();

      let dx = 0;
      let dy = 0;
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

      // Pickup logic
      const localPos = getLocalPlayerPos();
      const pickedBox = checkPickupCollision(localPos.x, localPos.y, serverPickupsRef.current);
      if (pickedBox) {
        const pt = pickedBox.type;
        serverPickupsRef.current = serverPickupsRef.current.filter(b => b !== pickedBox);
        setServerPickups([...serverPickupsRef.current]);
        triggerShake(5);
        const pickupColor = pt === 'shield' ? '#3498db' : pt === 'health' ? '#e74c3c' : '#f1c40f';
        particleSystemRef.current.emitExplosion(localPos.x, localPos.y, pickupColor, 15);
        addNotification(`¡${pt.toUpperCase()} RECOGIDO!`, 2000, 'default');
        playItemCollected();
        if (pt === 'shield') {
          emitPlayerInput({ action: 'activateShield' });
          emitCollectItem('shield', pickedBox.x, pickedBox.y);
        } else if (pt === 'health') {
          emitCollectItem('health', pickedBox.x, pickedBox.y);
        } else {
          const cfg = getGameConfig();
          const ammo = (cfg?.weapons[pt]?.ammo ?? 0) as number;
          setWeapon(pt as WeaponType, ammo);
          emitCollectItem(pt, pickedBox.x, pickedBox.y);
        }
      }

      // Update HUD state if changed
      const currentWeapon = getActiveWeapon();
      if (
        currentWeapon.type !== lastHudWeaponRef.current.type ||
        currentWeapon.ammo !== lastHudWeaponRef.current.ammo
      ) {
        lastHudWeaponRef.current = { type: currentWeapon.type, ammo: currentWeapon.ammo };
        setHudWeapon({ type: currentWeapon.type, ammo: currentWeapon.ammo });
      }

      const wantsToShoot = keys[' '] || keys['enter'] || isMouseDown || shootPendingMobile.current;
      const canShoot = wantsToShoot ? consumeAmmo() : false;

      if (canShoot) {
        let aimDx = 0;
        let aimDy = 0;

        if (!isMobileDevice && (mouseAim.x !== 0 || mouseAim.y !== 0)) {
          const cam = cameraRef.current;
          const worldMouseX = mouseAim.x + cam.x;
          const worldMouseY = mouseAim.y + cam.y;
          const adx = worldMouseX - localPos.x;
          const ady = worldMouseY - localPos.y;
          const mag = Math.sqrt(adx * adx + ady * ady);
          if (mag > 0) { aimDx = adx / mag; aimDy = ady / mag; }
        } else {
          const dir = getLastDirection();
          aimDx = dir.x;
          aimDy = dir.y;
        }

        emitPlayerInput({ action: 'shoot', aimDx, aimDy, weaponType: currentWeapon.type });
        const angle = Math.atan2(aimDy, aimDx);

        if (currentWeapon.type === 'laser') {
          particleSystemRef.current.emitLaserMuzzleFlash(localPos.x + aimDx * 25, localPos.y + aimDy * 25, angle);
          triggerShake(4);
          playLaser();
        } else if (currentWeapon.type === 'shotgun') {
          particleSystemRef.current.emitShotgunMuzzleFlash(localPos.x + aimDx * 25, localPos.y + aimDy * 25, angle);
          triggerShake(8);
          playShoot();
        } else if (currentWeapon.type === 'rocket') {
          particleSystemRef.current.emitMuzzleFlash(localPos.x + aimDx * 25, localPos.y + aimDy * 25, angle);
          triggerShake(6);
          playRocket();
        } else {
          particleSystemRef.current.emitMuzzleFlash(localPos.x + aimDx * 25, localPos.y + aimDy * 25, angle);
          triggerShake(3);
          playShoot();
        }

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
  }, [applyInput, emitPlayerInput, stepPhysics, getLocalPlayerPos, getLastDirection, isMobileDevice, mobileMove, playShoot, playRocket, playItemCollected]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const localPos = getLocalPlayerPos();

    // Update camera (centered on player, clamped to map)
    const camX = Math.max(0, Math.min(arenaW - VIEWPORT_W, localPos.x - VIEWPORT_W / 2));
    const camY = Math.max(0, Math.min(arenaH - VIEWPORT_H, localPos.y - VIEWPORT_H / 2));
    cameraRef.current = { x: camX, y: camY };

    ctx.save();

    // Screen shake
    if (screenShakeRef.current > 0) {
      ctx.translate(
        (secureRandom() - 0.5) * screenShakeRef.current,
        (secureRandom() - 0.5) * screenShakeRef.current,
      );
    }

    ctx.translate(-camX, -camY);

    // Background
    ctx.fillStyle = '#111122';
    ctx.fillRect(camX, camY, VIEWPORT_W, VIEWPORT_H);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridStart = { x: Math.floor(camX / 40) * 40, y: Math.floor(camY / 40) * 40 };
    for (let x = gridStart.x; x < camX + VIEWPORT_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, camY); ctx.lineTo(x, camY + VIEWPORT_H); ctx.stroke();
    }
    for (let y = gridStart.y; y < camY + VIEWPORT_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(camX, y); ctx.lineTo(camX + VIEWPORT_W, y); ctx.stroke();
    }

    // Cover structures
    const structures = structuresRef.current;
    for (const s of structures) {
      if (
        s.x + s.width < camX || s.x > camX + VIEWPORT_W ||
        s.y + s.height < camY || s.y > camY + VIEWPORT_H
      ) continue;

      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.fillStyle = '#3d4a5c';
      ctx.fillRect(s.x, s.y, s.width, s.height);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#5a6a7e';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.width, s.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + 4, s.y + 4);
      ctx.lineTo(s.x + s.width - 4, s.y + s.height - 4);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Weapon pickups
    drawPickups(ctx, camX, camY, VIEWPORT_W, VIEWPORT_H, serverPickupsRef.current);

    const now = Date.now();

    // Projectiles
    const projectiles = getInterpolatedProjectiles(now);
    projectiles.forEach(proj => {
      ctx.save();
      ctx.beginPath();

      const isRocket = proj.weaponType === 'rocket';
      const isShotgun = proj.weaponType === 'shotgun';
      const isLaser = proj.weaponType === 'laser';
      const radius = isRocket ? projectileRadius * 1.5 : projectileRadius;

      if (isLaser) {
        const beamLen = 80;
        const lspeed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) || 1;
        const nx = proj.vx / lspeed;
        const ny = proj.vy / lspeed;
        const ex = proj.x + nx * beamLen;
        const ey = proj.y + ny * beamLen;

        // Glow exterior amplio
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#2ecc71';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Capa media neon
        ctx.strokeStyle = '#2ecc71';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#2ecc71';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Core blanco brillante
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#a3e4d7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Punta del haz
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#2ecc71';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (isRocket) {
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.translate(proj.x, proj.y);
        ctx.rotate(angle);

        ctx.fillStyle = '#f1c40f';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(radius * 1.5, 0);
        ctx.lineTo(-radius, radius * 0.8);
        ctx.lineTo(-radius * 0.4, 0);
        ctx.lineTo(-radius, -radius * 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, 0);
        ctx.lineTo(-radius * 1.8, radius * 0.3);
        ctx.lineTo(-radius * 2.5, 0);
        ctx.lineTo(-radius * 1.8, -radius * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.shadowBlur = 10;
        ctx.fill();
      } else {
        ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isShotgun ? '#f39c12' : '#ff4757';
        ctx.shadowBlur = isShotgun ? 12 : 15;
        ctx.shadowColor = isShotgun ? '#f39c12' : '#ff4757';
        ctx.fill();
      }

      ctx.restore();
    });

    // Particles
    particleSystemRef.current.draw(ctx);

    // Players
    const latestPlayers = getLatestPlayers();
    latestPlayers.forEach(p => {
      const isLocal = p.userId === localPlayer.userId;
      const pos = isLocal ? localPos : getInterpolatedPlayer(p.userId, now);
      drawPlayer(ctx, pos.x, pos.y, p.name, isLocal, p.shield);
    });

    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string, isLocal: boolean, shield: number) => {
    ctx.save();

    // Shield Aura
    if (shield > 0) {
      ctx.beginPath();
      ctx.arc(x, y, playerRadius + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#3498db';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(x, y, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = isLocal ? '#f1c40f' : '#2980b9';
    ctx.shadowBlur = 15;
    ctx.shadowColor = isLocal ? '#f1c40f' : '#3498db';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.stroke();

    const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, x, y - playerRadius - 10);
    ctx.restore();
  };

  return (
    <div
      className={styles.arenaOverlay}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
    >
      <div className={`${styles.hitVignette} ${isHit ? styles.active : ''}`} />

      {/* ── Aviso de orientación (solo móvil en portrait) ────────────────── */}
      {isMobileDevice && isPortrait && (
        <div className={styles.rotateOverlay}>
          <div className={styles.rotateIcon}><Delapouite.ClockwiseRotation size={64} color="#f1c40f" /></div>
          <p className={styles.rotateText}>Gira tu teléfono para jugar</p>
          <p className={styles.rotateSubtext}>Este juego requiere orientación horizontal</p>
        </div>
      )}

      {/* ── Área de juego (canvas) ───────────────────────────────────────── */}
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={VIEWPORT_W}
          height={VIEWPORT_H}
          className={styles.gameCanvas}
        />

        {/* Exit button */}
        <button
          type="button"
          onClick={() => { const { x, y } = getRandomSpawnPosition(); onReturn(x, y); }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
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

        {/* Kill feed */}
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

        {/* Weapon HUD — esquina inferior-derecha del canvas */}
        <div className={`${styles.weaponHUD} ${hudWeapon.type !== 'normal' ? styles[hudWeapon.type] : styles.hidden}`}>
          <div className={styles.weaponHUDIcon}>
            {hudWeapon.type === 'shotgun' ? (
              <Sbed.Shotgun size={28} color="currentColor" />
            ) : hudWeapon.type === 'laser' ? (
              <Lorc.LaserBlast size={28} color="currentColor" />
            ) : (
              <Lorc.Rocket size={28} color="currentColor" />
            )}
          </div>
          <div className={styles.weaponHUDInfo}>
            <div className={styles.weaponHUDName}>{hudWeapon.type.toUpperCase()}</div>
            <div className={styles.weaponHUDAmmo}>
              {Array.from({ length: Math.max(hudWeapon.ammo, 0) }).map((_, i) => (
                <div key={i} className={styles.ammoPip} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scoreboard lateral derecho — siempre visible ─────────────────── */}
      <div className={`${styles.sideScoreboard} ${styles.glassPanel}`}>
        <h3 className={styles.scoreboardTitle}>SCOREBOARD</h3>
        {leaderboard.sort((a, b) => b.kills - a.kills).slice(0, 6).map(p => (
          <div
            key={p.userId}
            className={`${styles.leaderboardEntry} ${p.userId === localPlayer.userId ? styles.active : ''}`}
          >
            <span title={p.name}>{p.name}</span>
            <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{p.kills} K</span>
          </div>
        ))}
        <div className={styles.localStatsPanel}>
          <div className={styles.barRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#e74c3c" style={{ filter: 'drop-shadow(0 0 3px #e74c3c)', flexShrink: 0 }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <div className={styles.healthBarOuter}>
              <div
                className={styles.healthBarInner}
                style={{ width: `${Math.max(0, (localStats.health / (arenaConfig?.player.maxHealth ?? 100)) * 100)}%` }}
              />
            </div>
          </div>
          <div className={styles.barRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3498db" style={{ filter: 'drop-shadow(0 0 3px #3498db)', flexShrink: 0 }}>
              <polygon points="13,2 4,14 12,14 11,22 20,10 12,10" />
            </svg>
            <div className={styles.shieldBarOuter}>
              <div
                className={styles.shieldBarInner}
                style={{ width: `${Math.max(0, (localStats.shield / (getGameConfig()?.shield?.maxShield ?? 50)) * 100)}%` }}
              />
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{localStats.kills}</span>
            <span className={styles.statLabel}>Kills</span>
          </div>
        </div>
      </div>

      {/* ── Controles móviles — position:fixed para que siempre sean visibles ── */}
      {isMobileDevice && !isPortrait && (
        <>
          {/* Joystick — esquina inferior izquierda de la pantalla */}
          <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 200, touchAction: 'none' }}>
            <VirtualJoystick onMove={(dx, dy) => setMobileMove({ dx, dy })} />
          </div>
          {/* Botón FUEGO — esquina inferior derecha de la pantalla, antes del scoreboard */}
          <div style={{ position: 'fixed', bottom: '24px', right: '180px', zIndex: 200 }}>
            <button
              type="button"
              onTouchStart={(e) => { e.preventDefault(); shootPendingMobile.current = true; }}
              onTouchEnd={(e) => { e.preventDefault(); }}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(231, 76, 60, 0.85)',
                border: '3px solid rgba(255,255,255,0.7)',
                color: '#fff', fontSize: '13px', fontWeight: 'bold',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
              aria-label="Disparar"
            >
              FUEGO
            </button>
          </div>
        </>
      )}

      {/* ── Game over overlays ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.gameOverOverlay}
          >
            <h1 style={{ fontSize: '64px', color: '#e74c3c', margin: 0 }}>HAS CAÍDO</h1>
            <p style={{ opacity: 0.7 }}>Fuiste derrotado en la arena.</p>
            <button
              className={styles.returnButton}
              onClick={() => { const { x, y } = getRandomSpawnPosition(); onReturn(x, y); }}
            >
              VOLVER AL MAPA
            </button>
          </motion.div>
        )}

        {showLastStanding && winnerName === localPlayer.name && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.gameOverOverlay}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: 0 }}>
              <Lorc.Trophy size={64} color="#f1c40f" />
              <h1 style={{ fontSize: '64px', margin: 0 }}>¡VICTORIA!</h1>
            </div>
            <p style={{ opacity: 0.7 }}>Eres el último sobreviviente.</p>
            <button
              className={styles.returnButton}
              onClick={() => { const { x, y } = getRandomSpawnPosition(); onReturn(x, y); }}
            >
              REGRESAR COMO HÉROE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default ArenaShooter;

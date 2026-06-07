import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useRealtimeMap } from '../hooks/useRealtimeMap';
import { useSocket } from '@/shared/contexts/SocketContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { secureRandom, generateSecureId } from '@/shared/utils/secureRandom';
import { UserInMap, ChatMessage } from '../types/realtime.types';
import { FOOTBALL_DUEL_ENABLED } from '@/shared/featureFlags';
import { drawDuelPads } from '@/features/football-duel/components/DuelPads';
import { drawCrown } from '@/features/football-duel/components/Crown';
import { PadId, PAD_AREAS, PadState, CrownState, DuelStartedPayload } from '@/features/football-duel/types/football-duel.types';
import FootballDuelMatch from '@/features/football-duel/components/FootballDuelMatch';
import Minimap from './Minimap';
import { drawShooterZone } from '@/features/arena-shooter/components/ShooterZone';
import ArenaShooter from '@/features/arena-shooter/components/ArenaShooter';
import { SHOOTER_ZONE_AREA, ShooterPlayerInfo } from '@/features/arena-shooter/types/arena-shooter.types';
import { drawWorldDecor } from './WorldDecor';
import { useAvatarImages } from '../hooks/useAvatarImages';
import { usePlayerCard } from '../hooks/usePlayerCard';
import { PlayerCard } from './PlayerCard';
import { VirtualJoystick } from '@/shared/components/VirtualJoystick';

interface ChatBubble extends ChatMessage {
  id: string;
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CANVAS_THEME = {
  grid: 'hsl(43 35% 82%)',
  foreground: 'hsl(0 0% 31%)',
  mutedForeground: 'hsl(0 0% 36%)',
  surface: 'hsl(0 0% 100%)',
  primary: 'hsl(12 70% 63%)',
  primaryDark: 'hsl(12 72% 48%)',
  secondary: 'hsl(146 53% 69%)',
  secondaryDeep: 'hsl(146 45% 52%)',
} as const;

// World dimensions (2Ã— the original map)
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;

// Viewport dimensions (what the player sees â€” fixed canvas size)
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;

const GRID_SIZE = 32;
const AVATAR_RADIUS = 14;       // smaller avatars so the bigger map feels more open
const MOVEMENT_SPEED = 3;
const PROXIMITY_THRESHOLD = 80;
const BUBBLE_TIMEOUT = 3000;
const LERP_FACTOR = 0.15;

const VirtualWorld: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const { preloadLocalUser, ensureRemoteUser, getImage, clearCache } = useAvatarImages();
  const { card: playerCard, loading: cardLoading, openCard, closeCard } = usePlayerCard(currentUser?.id ?? null);
  const {
    users: remoteUsers,
    chatHistory,
    move,
    sendMessage,
    targetPositions,
    myAuthId,
    padStates,
    crownState,
    activeDuel,
    checkDuelPads,
    clearActiveDuel,
    rejoinMap,
    joinMapWithPosition,
  } = useRealtimeMap();

  // â”€â”€ All mutable state that the RAF loop reads goes into refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const remoteUsersRef = useRef<UserInMap[]>(remoteUsers);
  const targetPositionsRef = useRef(targetPositions);
  const moveRef = useRef(move);
  const padStatesRef = useRef<PadState[]>(padStates);
  const crownStateRef = useRef<CrownState | null>(crownState);
  const checkDuelPadsRef = useRef(checkDuelPads);
  const isChatFocusedRef = useRef(false);
  const activeDuelRef = useRef<DuelStartedPayload | null>(activeDuel);
  const myAuthIdRef = useRef<string | null>(myAuthId);

  useEffect(() => { remoteUsersRef.current = remoteUsers; }, [remoteUsers]);
  useEffect(() => { targetPositionsRef.current = targetPositions; }, [targetPositions]);
  useEffect(() => { moveRef.current = move; }, [move]);
  useEffect(() => { padStatesRef.current = padStates; }, [padStates]);
  useEffect(() => { crownStateRef.current = crownState; }, [crownState]);
  useEffect(() => { checkDuelPadsRef.current = checkDuelPads; }, [checkDuelPads]);
  useEffect(() => { activeDuelRef.current = activeDuel; }, [activeDuel]);
  useEffect(() => { myAuthIdRef.current = myAuthId; }, [myAuthId]);

  // â”€â”€ React state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [player, setPlayer] = useState(() => ({
    x: secureRandom() * (WORLD_WIDTH - 200) + 100,
    y: secureRandom() * (WORLD_HEIGHT - 200) + 100,
    name: currentUser?.username || 'Tú',
    color: currentUser?.avatarColor || CANVAS_THEME.primaryDark,
  }));
  const playerRef = useRef(player);
  useEffect(() => {
    setPlayer((prev) => ({
      ...prev,
      name: currentUser?.username || prev.name,
      color: currentUser?.avatarColor || prev.color,
    }));
  }, [currentUser?.username, currentUser?.avatarColor]);

  const [inputMessage, setInputMessage] = useState('');
  const [nearbyUser, setNearbyUser] = useState<UserInMap | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [activeMatch, setActiveMatch] = useState<{
    matchId: string;
    role: 1 | 2;
    opponent: { userId: string; name: string };
  } | null>(null);

  // â”€â”€ Shooter Zone state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [shooterZoneState, setShooterZoneState] = useState<'available' | 'highlighted' | 'locked'>('available');
  const [shooterProgress, setShooterProgress] = useState(0);
  const [shooterActivePlayers, setShooterActivePlayers] = useState(0);
  const [inShooterArena, setInShooterArena] = useState(false);
  const [shooterRoomId, setShooterRoomId] = useState<string | null>(null);
  const [shooterInitialPlayers, setShooterInitialPlayers] = useState<ShooterPlayerInfo[]>([]);

  // Refs para acceder al estado del shooter dentro del RAF
  const shooterZoneStateRef = useRef<'available' | 'highlighted' | 'locked'>('available');
  const shooterProgressRef = useRef(0);
  const shooterActivePlayersRef = useRef(0);
  const inShooterArenaRef = useRef(false);

  useEffect(() => { shooterZoneStateRef.current = shooterZoneState; }, [shooterZoneState]);
  useEffect(() => { shooterProgressRef.current = shooterProgress; }, [shooterProgress]);
  useEffect(() => { shooterActivePlayersRef.current = shooterActivePlayers; }, [shooterActivePlayers]);
  useEffect(() => { inShooterArenaRef.current = inShooterArena; }, [inShooterArena]);

  const bubblesRef = useRef<ChatBubble[]>([]);
  const renderedUsersRef = useRef<UserInMap[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const keysPressed = useRef<Record<string, boolean>>({});

  // â”€â”€ Camera offset (top-left world coordinate visible in viewport) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cameraRef = useRef({ x: 0, y: 0 });

  const updateCamera = (px: number, py: number) => {
    const cx = px - VIEWPORT_WIDTH / 2;
    const cy = py - VIEWPORT_HEIGHT / 2;
    cameraRef.current = {
      x: Math.max(0, Math.min(cx, WORLD_WIDTH - VIEWPORT_WIDTH)),
      y: Math.max(0, Math.min(cy, WORLD_HEIGHT - VIEWPORT_HEIGHT)),
    };
  };

  // â”€â”€ Mobile detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // â”€â”€ Avatares: perfil local desde API; limpiar cachÃ© al entrar al mapa â”€â”€â”€â”€â”€
  useEffect(() => {
    clearCache();
    if (currentUser?.id) {
      preloadLocalUser(currentUser.id, currentUser.email);
    }
  }, [currentUser?.id, currentUser?.email, preloadLocalUser, clearCache]);

  // â”€â”€ Chat bubbles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addBubble = useCallback((userId: string, userName: string, message: string) => {
    const bubble: ChatBubble = {
      id: generateSecureId(7),
      userId,
      name: userName,
      message,
      timestamp: Date.now(),
    };
    bubblesRef.current = [...bubblesRef.current.slice(-9), bubble];
    setTimeout(() => {
      bubblesRef.current = bubblesRef.current.filter(b => b.id !== bubble.id);
    }, BUBBLE_TIMEOUT);
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      const last = chatHistory[chatHistory.length - 1];
      addBubble(last.userId, last.name, last.message);
    }
  }, [chatHistory, addBubble]);

  // â”€â”€ Send initial position when socket connects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!socket?.connected) return;
    joinMapWithPosition(playerRef.current.x, playerRef.current.y);
  }, [socket, joinMapWithPosition]);

  // â”€â”€ Duel transition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!activeDuel) return;
    const uid = myAuthIdRef.current;
    if (!uid) return;
    const isP1 = activeDuel.player1.userId === uid;
    setActiveMatch({
      matchId: activeDuel.matchId,
      role: isP1 ? 1 : 2,
      opponent: isP1 ? activeDuel.player2 : activeDuel.player1,
    });
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (socket?.connected) socket.emit('leaveMap');
  }, [activeDuel, socket]);

  // â”€â”€ Shooter Zone socket listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!socket) return;

    // El servidor confirma que el jugador entrÃ³ a la arena
    const onShooterJoined = (payload: { roomId: string; players: ShooterPlayerInfo[] }) => {
      console.log('[VirtualWorld] ðŸ”« shooterJoined event received!', payload);
      if (inShooterArenaRef.current) {
        console.log('[VirtualWorld] Already in arena, ignoring event');
        return;
      }

      // Limpiar timeouts y estados de zona
      if (zoneFallbackTimerRef.current) {
        console.log('[VirtualWorld] Clearing fallback timer');
        clearTimeout(zoneFallbackTimerRef.current);
        zoneFallbackTimerRef.current = null;
      }
      zoneEntryStartRef.current = null;
      setShooterProgress(0);

      // Guardar estado inicial para ArenaShooter
      console.log('[VirtualWorld] Setting initial players:', payload.players);
      setShooterRoomId(payload.roomId);
      setShooterInitialPlayers(payload.players ?? []);
      setInShooterArena(true);
      inShooterArenaRef.current = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    // La zona estÃ¡ bloqueada (sala llena)
    const onZoneBlocked = () => {
      setShooterZoneState('locked');
    };

    // Estado de la sala del shooter (jugadores activos, etc.)
    const onRoomState = (payload: { activePlayers: number; players: ShooterPlayerInfo[] }) => {
      setShooterActivePlayers(payload.activePlayers);
      // Only update the initial players list when the server sends a non-empty array
      // (count-only broadcasts from ZoneService send players: [] to avoid overwriting)
      if (payload.players && payload.players.length > 0) {
        setShooterInitialPlayers(payload.players);
      }
      if (payload.activePlayers >= 6) {
        setShooterZoneState('locked');
      } else {
        setShooterZoneState(prev => prev === 'locked' ? 'available' : prev);
      }
    };

    socket.on('shooterJoined', onShooterJoined);
    socket.on('zoneBlocked', onZoneBlocked);
    socket.on('roomState', onRoomState);

    return () => {
      socket.off('shooterJoined', onShooterJoined);
      socket.off('zoneBlocked', onZoneBlocked);
      socket.off('roomState', onRoomState);
    };
  }, [socket]);

  // â”€â”€ Shooter Zone overlap check (cada 200 ms) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // entryStart en ref para que no se resetee cuando el socket reconecta
  const zoneEntryStartRef = useRef<number | null>(null);
  const zoneFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastZoneEmitRef = useRef<number>(0);

  useEffect(() => {
    const ENTRY_MS = 2000;

    const interval = setInterval(() => {
      if (inShooterArenaRef.current) return;
      const px = playerRef.current.x;
      const py = playerRef.current.y;
      const z = SHOOTER_ZONE_AREA;

      const inside =
        px >= z.x && px <= z.x + z.width &&
        py >= z.y && py <= z.y + z.height;

      if (inside) {
        if (zoneEntryStartRef.current === null) zoneEntryStartRef.current = Date.now();
        const elapsed = Date.now() - zoneEntryStartRef.current;
        const progress = Math.min(1, elapsed / ENTRY_MS);
        setShooterProgress(progress);
        setShooterZoneState('highlighted');

        // Emitir al socket del mapa para que el servidor valide la entrada
        if (socket?.connected) {
          // Re-emit cada 500ms aprox para evitar spam pero mantener vivo el tracker del server
          if (!lastZoneEmitRef.current || Date.now() - lastZoneEmitRef.current > 500) {
            console.log('[VirtualWorld] Emitting checkShooterZone at', { x: px, y: py });
            socket.emit('checkShooterZone', { x: px, y: py });
            lastZoneEmitRef.current = Date.now();
          }
        }

        // Fallback: si el progreso llega a 100% y el servidor no responde
        // en 500ms, entrar directamente (evita bloqueo por latencia)
        if (progress >= 1 && !zoneFallbackTimerRef.current) {
          zoneFallbackTimerRef.current = setTimeout(() => {
            zoneFallbackTimerRef.current = null;
            if (!inShooterArenaRef.current) {
              console.warn('[VirtualWorld] shooterJoined timeout â€” entering arena directly');
              zoneEntryStartRef.current = null;
              setShooterProgress(0);
              setShooterRoomId('arena-main');
              setShooterInitialPlayers([]);
              setInShooterArena(true);
              if (requestRef.current) cancelAnimationFrame(requestRef.current);
            }
          }, 500);
        }
      } else {
        zoneEntryStartRef.current = null;
        if (zoneFallbackTimerRef.current) {
          clearTimeout(zoneFallbackTimerRef.current);
          zoneFallbackTimerRef.current = null;
        }
        setShooterZoneState(prev => prev === 'highlighted' ? 'available' : prev);
        setShooterProgress(0);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (zoneFallbackTimerRef.current) clearTimeout(zoneFallbackTimerRef.current);
    };
  }, [socket]);

  // â”€â”€ Main RAF loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const update = useCallback(() => {
    let dx = 0, dy = 0;

    if (!isChatFocusedRef.current) {
      const k = keysPressed.current;
      let rawDx = 0, rawDy = 0;
      if (k.w || k.ArrowUp || k['btn-up']) rawDy -= 1;
      if (k.s || k.ArrowDown || k['btn-down']) rawDy += 1;
      if (k.a || k.ArrowLeft || k['btn-left']) rawDx -= 1;
      if (k.d || k.ArrowRight || k['btn-right']) rawDx += 1;
      // Normalise diagonal so speed is always MOVEMENT_SPEED
      const mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      if (mag > 0) { dx = (rawDx / mag) * MOVEMENT_SPEED; dy = (rawDy / mag) * MOVEMENT_SPEED; }
    }

    if (dx !== 0 || dy !== 0) {
      const nx = Math.max(AVATAR_RADIUS, Math.min(WORLD_WIDTH - AVATAR_RADIUS, playerRef.current.x + dx));
      const ny = Math.max(AVATAR_RADIUS, Math.min(WORLD_HEIGHT - AVATAR_RADIUS, playerRef.current.y + dy));
      if (nx !== playerRef.current.x || ny !== playerRef.current.y) {
        const next = { ...playerRef.current, x: nx, y: ny };
        playerRef.current = next;
        setPlayer(next);
        moveRef.current(nx, ny);
      }
    }

    // Update camera to follow player
    updateCamera(playerRef.current.x, playerRef.current.y);

    // Interpolate remote users
    const myId = myAuthIdRef.current || '';
    const updated = remoteUsersRef.current
      .filter(u => u.userId !== myId)
      .map(user => {
        const target = targetPositionsRef.current[user.userId] || { x: user.x, y: user.y };
        const prev = renderedUsersRef.current.find(r => r.userId === user.userId);
        const cx = prev ? prev.x : user.x;
        const cy = prev ? prev.y : user.y;
        return {
          ...user,
          color: user.color || CANVAS_THEME.secondaryDeep,
          x: cx + (target.x - cx) * LERP_FACTOR,
          y: cy + (target.y - cy) * LERP_FACTOR,
        };
      });
    renderedUsersRef.current = updated;

    // Proximity check
    let closest: UserInMap | null = null;
    let minDist = PROXIMITY_THRESHOLD;
    updated.forEach(u => {
      const d = Math.hypot(u.x - playerRef.current.x, u.y - playerRef.current.y);
      if (d < minDist) { minDist = d; closest = u; }
    });
    if (nearbyUser?.userId !== closest?.userId) setNearbyUser(closest);

    if (FOOTBALL_DUEL_ENABLED) {
      checkDuelPadsRef.current?.(playerRef.current.x, playerRef.current.y);
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, []); // stable

  // â”€â”€ Canvas draw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cam = cameraRef.current;
    const pads = padStatesRef.current;
    const crown = crownStateRef.current;
    const uid = myAuthIdRef.current;

    ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Apply camera transform â€” everything drawn after this is in world space
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // World decorations: grass, paths, buildings, trees, lamps, benches
    drawWorldDecor(ctx, cam.x, cam.y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, Date.now());

    // Duel pads (football-duel feature)
    if (FOOTBALL_DUEL_ENABLED) {
      const padsToRender: PadState[] = pads.length > 0 ? pads : [
        { padId: 'pad-a', status: 'available', activationProgress: 0 },
        { padId: 'pad-b', status: 'available', activationProgress: 0 },
      ];
      const localOverlap = (['pad-a', 'pad-b'] as PadId[]).find(padId => {
        const a = PAD_AREAS[padId];
        const px = playerRef.current.x, py = playerRef.current.y;
        const cx = Math.max(a.x, Math.min(px, a.x + a.width));
        const cy = Math.max(a.y, Math.min(py, a.y + a.height));
        return (px - cx) ** 2 + (py - cy) ** 2 <= AVATAR_RADIUS ** 2;
      }) ?? null;
      drawDuelPads({ ctx, padStates: padsToRender, localPlayerOverlap: localOverlap });
    }

    // Shooter Zone
    drawShooterZone({
      ctx,
      zone: SHOOTER_ZONE_AREA,
      state: shooterZoneStateRef.current,
      progress: shooterProgressRef.current,
      activePlayers: shooterActivePlayersRef.current,
    });

    // Remote users
    renderedUsersRef.current.forEach(user => {
      ensureRemoteUser(user.userId, user.email);
      drawAvatar(ctx, user.x, user.y, user.color || CANVAS_THEME.secondaryDeep, user.name, false, getImage(user.userId));
      drawBubble(ctx, user.x, user.y, user.userId);
      if (FOOTBALL_DUEL_ENABLED && crown?.winnerId === user.userId) drawCrown(ctx, user.x, user.y);
    });

    // Local player
    drawAvatar(ctx, playerRef.current.x, playerRef.current.y, playerRef.current.color, playerRef.current.name, true, getImage(uid || ''));
    drawBubble(ctx, playerRef.current.x, playerRef.current.y, uid || 'me');
    if (FOOTBALL_DUEL_ENABLED && crown?.winnerId === uid) drawCrown(ctx, playerRef.current.x, playerRef.current.y);

    ctx.restore();
  };

  const drawAvatar = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string, isMe = false, profileImg: HTMLImageElement | null = null) => {
    // Ground shadow ellipse
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + AVATAR_RADIUS - 2, AVATAR_RADIUS * 0.85, AVATAR_RADIUS * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clip to circle for both the fill and the profile image
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(x, y, AVATAR_RADIUS, 0, Math.PI * 2);

    if (profileImg) {
      // Fill with color first as background (in case image has transparency)
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // Clip and draw the profile picture
      ctx.clip();
      const d = AVATAR_RADIUS * 2;
      ctx.drawImage(profileImg, x - AVATAR_RADIUS, y - AVATAR_RADIUS, d, d);
    } else {
      // Fallback: solid color circle
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.restore();

    // Border ring (drawn after restore so it's not clipped)
    ctx.beginPath();
    ctx.arc(x, y, AVATAR_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Name tag pill background
    ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(name).width;
    const tagH = 14, tagW = textW + 10;
    const tagX = x - tagW / 2, tagY = y - AVATAR_RADIUS - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tagX, tagY, tagW, tagH, 4);
    else ctx.rect(tagX, tagY, tagW, tagH);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, x, tagY + tagH - 3);

    // "Me" ring with pulsing glow
    if (isMe) {
      const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 500);
      ctx.strokeStyle = `rgba(255, 185, 30, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,185,30,0.7)';
      ctx.beginPath();
      ctx.arc(x, y, AVATAR_RADIUS + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, userId: string) => {
    const bubble = bubblesRef.current.find(b => b.userId === userId);
    if (!bubble) return;
    const padding = 8, maxWidth = 140;
    ctx.font = '11px "DM Sans", sans-serif';
    const lines = wrapText(ctx, bubble.message, maxWidth);
    const bh = lines.length * 15 + padding * 2;
    const bw = Math.min(maxWidth, ctx.measureText(bubble.message).width + padding * 2);
    const bx = x - bw / 2, by = y - AVATAR_RADIUS - 36 - bh;
    ctx.fillStyle = CANVAS_THEME.surface;
    ctx.strokeStyle = CANVAS_THEME.grid;
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 7);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4, by + bh); ctx.lineTo(x + 4, by + bh); ctx.lineTo(x, by + bh + 7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CANVAS_THEME.mutedForeground;
    ctx.textAlign = 'left';
    lines.forEach((line, i) => ctx.fillText(line, bx + padding, by + padding + 11 + i * 15));
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = words[0] ?? '';
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      if (ctx.measureText(`${cur} ${w}`).width < maxWidth) cur += ` ${w}`;
      else { lines.push(cur); cur = w; }
    }
    lines.push(cur);
    return lines;
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };

  // â”€â”€ Start/stop RAF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      if ((e.key === 'm' || e.key === 'M') && !isChatFocusedRef.current) {
        setMinimapVisible(v => !v);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Initialise camera on mount
    updateCamera(playerRef.current.x, playerRef.current.y);
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  const handleMobileControl = (key: string, pressed: boolean) => {
    keysPressed.current[key] = pressed;
  };

  // Joystick handler: receives normalised dx/dy (-1..1) from the joystick
  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    const DEAD = 0.25;
    keysPressed.current['btn-up'] = dy < -DEAD;
    keysPressed.current['btn-down'] = dy > DEAD;
    keysPressed.current['btn-left'] = dx < -DEAD;
    keysPressed.current['btn-right'] = dx > DEAD;
  }, []);


  // â”€â”€ Canvas click â†’ open player card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Scale mouse coords to canvas logical pixels
    const scaleX = VIEWPORT_WIDTH / rect.width;
    const scaleY = VIEWPORT_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Convert viewport coords â†’ world coords
    const worldX = mouseX + cameraRef.current.x;
    const worldY = mouseY + cameraRef.current.y;

    // Hit-test against rendered remote users
    const HIT_RADIUS = AVATAR_RADIUS + 6; // slightly larger than visual for easier clicking
    const hit = renderedUsersRef.current.find((u) => {
      const dx = u.x - worldX;
      const dy = u.y - worldY;
      return dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS;
    });

    if (hit) {
      // Anchor the card at the avatar's viewport position
      const vpX = hit.x - cameraRef.current.x;
      const vpY = hit.y - cameraRef.current.y;
      openCard(hit.userId, hit.name, vpX, vpY, hit.email);
    } else {
      closeCard();
    }
  }, [openCard, closeCard]);

  const handleMatchEnd = useCallback((spawnX: number, spawnY: number) => {
    const next = { ...playerRef.current, x: spawnX, y: spawnY };
    playerRef.current = next;
    setPlayer(next);
    updateCamera(spawnX, spawnY);
    setActiveMatch(null);
    clearActiveDuel();
    rejoinMap();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setTimeout(() => {
      requestRef.current = requestAnimationFrame(update);
    }, 0);
  }, [clearActiveDuel, rejoinMap, update]);

  // â”€â”€ Shooter return handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleShooterReturn = useCallback((spawnX: number, spawnY: number) => {
    const next = { ...playerRef.current, x: spawnX, y: spawnY };
    playerRef.current = next;
    setPlayer(next);
    updateCamera(spawnX, spawnY);
    setInShooterArena(false);
    setShooterRoomId(null);
    setShooterZoneState('available');
    setShooterProgress(0);
    // Notify server to clear triggered state so player can re-enter
    socket?.emit('clearShooterZone');
    rejoinMap();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setTimeout(() => {
      requestRef.current = requestAnimationFrame(update);
    }, 0);
  }, [rejoinMap, update, socket]);

  // â”€â”€ Shooter Arena screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (inShooterArena && shooterRoomId) {
    return (
      <ArenaShooter
        roomId={shooterRoomId}
        localPlayer={{ userId: myAuthIdRef.current ?? '', name: currentUser?.username ?? 'TÃº' }}
        initialPlayers={shooterInitialPlayers}
        onReturn={handleShooterReturn}
      />
    );
  }

  // â”€â”€ Match screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (FOOTBALL_DUEL_ENABLED && activeMatch) {
    const localName = currentUser?.username || 'TÃº';
    return (
      <FootballDuelMatch
        matchId={activeMatch.matchId}
        localPlayer={{ userId: myAuthIdRef.current ?? '', name: localName, role: activeMatch.role }}
        opponent={activeMatch.opponent}
        onMatchEnd={handleMatchEnd}
      />
    );
  }

  // â”€â”€ Map screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-6xl mx-auto bg-muted/50 lg:rounded-2xl shadow-elevated border border-border overflow-hidden animate-in fade-in duration-500 min-h-[90vh] lg:min-h-0">
      <div className="relative flex-1 flex flex-col min-h-0">
        <div className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" aria-hidden />
          <span className="text-xs font-semibold text-foreground">Box.io Games</span>
        </div>

        <div className="relative bg-card rounded-xl border border-border shadow-inner overflow-hidden h-[400px] lg:h-[600px]">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_WIDTH}
            height={VIEWPORT_HEIGHT}
            className="cursor-crosshair block w-full h-full"
            style={{ background: '#5a8c3a' }}
            onClick={handleCanvasClick}
          />
          <PlayerCard
            card={playerCard}
            loading={cardLoading}
            viewportWidth={VIEWPORT_WIDTH}
            viewportHeight={VIEWPORT_HEIGHT}
            onClose={closeCard}
          />
          <Minimap
            playerX={player.x}
            playerY={player.y}
            remoteUsers={renderedUsersRef.current}
            visible={minimapVisible}
            onToggle={() => setMinimapVisible(v => !v)}
          />
        </div>

        {isMobile && (
          <div className="flex justify-start items-center mt-4 px-2">
            <VirtualJoystick onMove={handleJoystickMove} />
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); if (inputMessage.trim()) { sendMessage(inputMessage); setInputMessage(''); } }}
          className="mt-4 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputMessage}
              onFocus={() => { isChatFocusedRef.current = true; }}
              onBlur={() => { isChatFocusedRef.current = false; }}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full pl-4 pr-12 py-3 bg-card rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-sm text-foreground placeholder:text-muted-foreground"
            />
            <button type="submit" className="absolute right-2 top-1.5 p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      <div className="lg:w-80 flex flex-col bg-card rounded-xl border border-border shadow-card overflow-hidden h-[300px] lg:h-auto">
        <div className="p-4 border-b border-border flex items-center gap-2 flex-shrink-0">
          <MessageSquare className="text-primary" size={20} aria-hidden />
          <h3 className="font-bold text-foreground">Historial de Chat</h3>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar min-h-0">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70 space-y-2 py-8">
              <MessageSquare size={32} aria-hidden />
              <p className="text-sm">No hay mensajes aÃºn</p>
            </div>
          ) : (
            chatHistory.map((chat, i) => (
              <div key={i} className={`flex flex-col ${chat.userId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                <span className="text-xs font-bold text-muted-foreground uppercase mb-0.5">{chat.name}</span>
                <div className={`px-3 py-2 rounded-2xl text-sm ${chat.userId === currentUser?.id ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                  {chat.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualWorld;

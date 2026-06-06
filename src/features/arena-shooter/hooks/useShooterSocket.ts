import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ShooterSnapshot,
  isValidShooterSnapshot,
  ShooterInput,
  PlayerHitPayload,
  PlayerEliminatedPayload,
  PlayerLeftPayload,
  ReturnPayload,
  RoomStatePayload,
  RocketExplosionPayload,
  ShieldAbsorbedPayload,
} from '../types/arena-shooter.types';
import { realTimeURL } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';

const REALTIME_URL = import.meta.env.VITE_REALTIME_URL || realTimeURL;
const RECONNECT_TIMEOUT_MS = 10000;
const EMIT_THROTTLE_MOVE_MS = 16;
const EMIT_THROTTLE_SHOOT_MS = 300;

interface UseShooterSocketProps {
  roomId: string;
  playerName: string;
  onSnapshot: (snapshot: ShooterSnapshot) => void;
  onRoomState?: (payload: RoomStatePayload) => void;
  onPlayerHit?: (payload: PlayerHitPayload) => void;
  onPlayerEliminated?: (payload: PlayerEliminatedPayload) => void;
  onPlayerLeft?: (payload: PlayerLeftPayload) => void;
  onPlayerJoined?: (payload: { userId: string; name: string }) => void;
  onLastPlayerStanding?: (payload: { userId: string }) => void;
  onReturnToVirtualWorld?: (payload: ReturnPayload) => void;
  onRocketExplosion?: (payload: RocketExplosionPayload) => void;
  onShieldAbsorbed?: (payload: ShieldAbsorbedPayload) => void;
  onRoomFull?: () => void;
  onConnectionLost?: () => void;
  onReconnected?: () => void;
}

export const useShooterSocket = ({
  roomId,
  playerName,
  onSnapshot,
  onRoomState,
  onPlayerHit,
  onPlayerEliminated,
  onPlayerLeft,
  onPlayerJoined,
  onLastPlayerStanding,
  onReturnToVirtualWorld,
  onRocketExplosion,
  onShieldAbsorbed,
  onRoomFull,
  onConnectionLost,
  onReconnected,
}: UseShooterSocketProps) => {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastEmitMoveRef = useRef<number>(0);
  const lastEmitShootRef = useRef<number>(0);

  // Use refs for callbacks to avoid stale closures
  const callbacks = useRef({
    onSnapshot,
    onRoomState,
    onPlayerHit,
    onPlayerEliminated,
    onPlayerLeft,
    onPlayerJoined,
    onLastPlayerStanding,
    onReturnToVirtualWorld,
    onRocketExplosion,
    onShieldAbsorbed,
    onRoomFull,
    onConnectionLost,
    onReconnected,
  });

  useEffect(() => {
    callbacks.current = {
      onSnapshot,
      onRoomState,
      onPlayerHit,
      onPlayerEliminated,
      onPlayerLeft,
      onPlayerJoined,
      onLastPlayerStanding,
      onReturnToVirtualWorld,
      onRocketExplosion,
      onRoomFull,
      onConnectionLost,
      onReconnected,
    };
  }, [
    onSnapshot, onRoomState, onPlayerHit, onPlayerEliminated,
    onPlayerLeft, onPlayerJoined, onLastPlayerStanding,
    onReturnToVirtualWorld, onRocketExplosion, onShieldAbsorbed, onRoomFull, onConnectionLost, onReconnected,
  ]);

  useEffect(() => {
    if (!token) {
      console.warn('[useShooterSocket] No auth token — skipping socket connection');
      return;
    }

    // Flag: set to true when we return intentionally so the disconnect
    // timeout doesn't fire a second onReturnToVirtualWorld call.
    let intentionalReturn = false;

    const socket = io(`${REALTIME_URL}/shooter-arena`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useShooterSocket] ✅ Connected to shooter-arena');
      setIsConnected(true);
      setIsReconnecting(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
        callbacks.current.onReconnected?.();
      }
      socket.emit('joinRoom', { name: playerName, roomId });
    });

    socket.on('disconnect', () => {
      console.warn('[useShooterSocket] Disconnected from shooter-arena');
      setIsConnected(false);

      // Only trigger the reconnect/return flow for unexpected disconnects,
      // not when we intentionally returned to the virtual world.
      if (intentionalReturn) return;

      setIsReconnecting(true);
      callbacks.current.onConnectionLost?.();
      reconnectTimerRef.current = setTimeout(() => {
        setIsReconnecting(false);
        socket.disconnect();
        const { x, y } = { x: 400, y: 300 };
        callbacks.current.onReturnToVirtualWorld?.({ spawnX: x, spawnY: y });
      }, RECONNECT_TIMEOUT_MS);
    });

    socket.on('error', (error: unknown) => {
      console.error('[useShooterSocket] ❌ Server error:', error);
    });

    socket.on('connect_error', (error: unknown) => {
      console.error('[useShooterSocket] ❌ Connection error:', error);
    });

    socket.on('snapshot', (raw: unknown) => {
      if (isValidShooterSnapshot(raw)) {
        callbacks.current.onSnapshot(raw);
      }
    });

    socket.on('playerHit', (p: PlayerHitPayload) => callbacks.current.onPlayerHit?.(p));
    socket.on('playerEliminated', (p: PlayerEliminatedPayload) => callbacks.current.onPlayerEliminated?.(p));
    socket.on('playerLeft', (p: PlayerLeftPayload) => callbacks.current.onPlayerLeft?.(p));
    socket.on('playerJoined', (p: { userId: string; name: string }) => callbacks.current.onPlayerJoined?.(p));
    socket.on('roomState', (s: RoomStatePayload) => callbacks.current.onRoomState?.(s));
    socket.on('lastPlayerStanding', (p: { userId: string }) => callbacks.current.onLastPlayerStanding?.(p));
    socket.on('rocketExplosion', (p: RocketExplosionPayload) => callbacks.current.onRocketExplosion?.(p));
    socket.on('shieldAbsorbed', (p: ShieldAbsorbedPayload) => callbacks.current.onShieldAbsorbed?.(p));
    socket.on('returnToVirtualWorld', (p: ReturnPayload) => {
      intentionalReturn = true;
      callbacks.current.onReturnToVirtualWorld?.(p);
    });
    socket.on('roomFull', () => callbacks.current.onRoomFull?.());

    return () => {
      intentionalReturn = true; // Mark as intentional before cleanup disconnect
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, playerName, token]);

  const emitPlayerInput = useCallback((input: ShooterInput) => {
    const now = Date.now();
    if (input.action === 'move') {
      if (now - lastEmitMoveRef.current < EMIT_THROTTLE_MOVE_MS) return;
      lastEmitMoveRef.current = now;
    } else if (input.action === 'shoot') {
      if (now - lastEmitShootRef.current < EMIT_THROTTLE_SHOOT_MS) return;
      lastEmitShootRef.current = now;
    }
    socketRef.current?.emit('playerInput', input);
  }, []);

  return { isConnected, isReconnecting, emitPlayerInput };
};

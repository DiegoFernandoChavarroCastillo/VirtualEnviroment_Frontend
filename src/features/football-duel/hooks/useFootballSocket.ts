import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  FootballDuelState,
  DuelSnapshot,
  PlayerInput,
  MatchEndedPayload,
  ReturnToVirtualWorldPayload,
  isValidSnapshot,
} from '../types/football-duel.types';
import { realTimeURL } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';

const REALTIME_URL = import.meta.env.VITE_REALTIME_URL || realTimeURL;
const EMIT_THROTTLE_MS = 16; // ~60 fps

interface UseFootballSocketOptions {
  matchId: string;
  onGoalScored?: (payload: { scorerId: string; score: Record<string, number> }) => void;
  onMatchEnded?: (payload: MatchEndedPayload) => void;
  onReturnToVirtualWorld?: (payload: ReturnToVirtualWorldPayload) => void;
  onMatchNotFound?: (matchId: string) => void;
}

interface UseFootballSocketReturn {
  matchState: FootballDuelState | null;
  lastSnapshot: DuelSnapshot | null;
  isConnected: boolean;
  emitPlayerInput: (input: PlayerInput) => void;
}

export function useFootballSocket({
  matchId,
  onGoalScored,
  onMatchEnded,
  onReturnToVirtualWorld,
  onMatchNotFound,
}: UseFootballSocketOptions): UseFootballSocketReturn {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const lastEmitRef = useRef<number>(0);

  const [matchState, setMatchState] = useState<FootballDuelState | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<DuelSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      console.warn('[useFootballSocket] No auth token — skipping socket connection');
      return;
    }

    console.log('[useFootballSocket] Connecting to /football-duel with matchId:', matchId);

    const socket = io(`${REALTIME_URL}/football-duel`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      // Performance optimizations for game
      timeout: 20000,
      forceNew: false,
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useFootballSocket] Connected, joining match:', matchId);
      setIsConnected(true);
      socket.emit('joinMatch', { matchId });
    });

    socket.on('disconnect', () => {
      console.log('[useFootballSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('matchState', (state: FootballDuelState) => {
      console.log('[useFootballSocket] Received matchState:', state);
      setMatchState(state);
    });

    socket.on('snapshot', (raw: unknown) => {
      if (isValidSnapshot(raw)) {
        setLastSnapshot(raw);
      } else {
        console.error('[useFootballSocket] Invalid snapshot discarded', raw);
      }
    });

    socket.on('goalScored', (payload: { scorerId: string; score: Record<string, number> }) => {
      console.log('[useFootballSocket] Goal scored:', payload);
      onGoalScored?.(payload);
    });

    socket.on('matchEnded', (payload: MatchEndedPayload) => {
      console.log('[useFootballSocket] Match ended:', payload);
      onMatchEnded?.(payload);
    });

    socket.on('returnToVirtualWorld', (payload: ReturnToVirtualWorldPayload) => {
      console.log('[useFootballSocket] Return to virtual world:', payload);
      onReturnToVirtualWorld?.(payload);
    });

    socket.on('matchNotFound', ({ matchId: id }: { matchId: string }) => {
      console.error('[useFootballSocket] Match not found:', id);
      onMatchNotFound?.(id);
    });

    return () => {
      console.log('[useFootballSocket] Disconnecting socket');
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, token]);

  /** Throttled emit – max 60 events/s */
  const emitPlayerInput = useCallback((input: PlayerInput) => {
    const now = Date.now();
    if (now - lastEmitRef.current < EMIT_THROTTLE_MS) return;
    lastEmitRef.current = now;
    socketRef.current?.emit('playerInput', { matchId, ...input });
  }, [matchId]);

  return { matchState, lastSnapshot, isConnected, emitPlayerInput };
}

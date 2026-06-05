import { useEffect, useRef, useCallback, useReducer, useState } from 'react';
import { useSocket } from '@/shared/contexts/SocketContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { UserInMap, ChatMessage, Position, AvatarPosition, PositionUpdate, RealtimeError } from '../types/realtime.types';
import { toast } from '@/shared/components/ui/use-toast';
import { FOOTBALL_DUEL_ENABLED } from '@/shared/featureFlags';
import {
  PadState,
  CrownState,
  DuelStartedPayload,
} from '@/features/football-duel/types/football-duel.types';

// ─── State shape ─────────────────────────────────────────────────────────────

interface MapState {
  users: UserInMap[];
  chatHistory: ChatMessage[];
  isConnected: boolean;
}

const INITIAL_STATE: MapState = {
  users: [],
  chatHistory: [],
  isConnected: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

type MapAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'RESET' }
  | { type: 'SET_INITIAL_POSITIONS'; users: UserInMap[] }
  | { type: 'USER_JOINED'; user: UserInMap }
  | { type: 'USER_LEFT'; userId: string }
  | { type: 'CHAT_MESSAGE'; msg: ChatMessage };

function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, isConnected: true };

    case 'DISCONNECTED':
      return { ...state, isConnected: false };

    case 'RESET':
      return INITIAL_STATE;

    case 'SET_INITIAL_POSITIONS': {
      console.log(
        `[useRealtimeMap] 📥 Received initialPositions with ${action.users.length} users:`,
        action.users.map(u => ({ userId: u.userId, name: u.name })),
      );
      return { ...state, users: action.users };
    }

    case 'USER_JOINED': {
      const filtered = state.users.filter(u => u.userId !== action.user.userId);
      return { ...state, users: [...filtered, action.user] };
    }

    case 'USER_LEFT':
      return { ...state, users: state.users.filter(u => u.userId !== action.userId) };

    case 'CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory.slice(-49), action.msg] };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useRealtimeMap = () => {
  const { socket, isConnected: socketConnected } = useSocket();
  const { user, logout } = useAuth();
  const [state, dispatch] = useReducer(mapReducer, INITIAL_STATE);

  // Football Duel state — only tracked when the feature is enabled.
  const [padStates, setPadStates] = useState<PadState[]>([]);
  const [crownState, setCrownState] = useState<CrownState | null>(null);
  const [activeDuel, setActiveDuel] = useState<DuelStartedPayload | null>(null);

  const targetPositions = useRef<Record<string, Position>>({});
  const lastUpdateSent = useRef<number>(0);
  const hasJoinedMap = useRef<boolean>(false);
  const THROTTLE_MS = 60;
  const lastPadCheckSent = useRef<number>(0);
  const PAD_CHECK_THROTTLE_MS = 100; // Send pad position checks frequently for reliable detection

  // The current user comes from the AuthProvider (no localStorage lookups).
  const myAuthId = useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    myAuthId.current = user?.id ?? null;
  }, [user?.id]);

  // ── Mount / unmount cleanup ───────────────────────────────────────────────
  useEffect(() => {
    console.log('[useRealtimeMap] 🚀 Component mounted - resetting all state');
    dispatch({ type: 'RESET' });
    targetPositions.current = {};
    hasJoinedMap.current = false;

    return () => {
      console.log('[useRealtimeMap] 🧹 Component unmounting');
      dispatch({ type: 'RESET' });
      targetPositions.current = {};
      hasJoinedMap.current = false;
    };
  }, []);

  // ── Register socket event listeners (only when socket instance changes) ──
  useEffect(() => {
    if (!socket) return;

    console.log('[useRealtimeMap] setting up listeners — socket id:', socket.id);

    const onInitialPositions = (initialUsers: AvatarPosition[]) => {
      const users: UserInMap[] = initialUsers
        .filter(u => {
          if (u.userId === myAuthId.current) {
            console.log(`[useRealtimeMap] 🚫 Filtering self (${u.userId}) from initialPositions`);
            return false;
          }
          return true;
        })
        .map(u => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          color: u.color || '#6366f1',
          x: u.x,
          y: u.y,
        }));

      targetPositions.current = {};
      users.forEach(u => {
        targetPositions.current[u.userId] = { x: u.x, y: u.y };
      });

      dispatch({ type: 'SET_INITIAL_POSITIONS', users });
    };

    const onUserJoined = (payload: { userId: string; name: string; email: string; x: number; y: number; timestamp: number }) => {
      if (payload.userId === myAuthId.current) return;

      const newUser: UserInMap = {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        color: '#6366f1',
        x: payload.x ?? 400,
        y: payload.y ?? 300,
        timestamp: payload.timestamp,
      };

      targetPositions.current[payload.userId] = { x: newUser.x, y: newUser.y };
      dispatch({ type: 'USER_JOINED', user: newUser });

      toast({
        title: 'Nuevo usuario',
        description: `${payload.name} ha entrado al mapa`,
      });
    };

    const onUserLeft = (payload: { userId: string }) => {
      console.log('[useRealtimeMap] 👋 userLeft received:', payload);
      delete targetPositions.current[payload.userId];
      dispatch({ type: 'USER_LEFT', userId: payload.userId });
    };

    const onPositionUpdate = (update: PositionUpdate) => {
      if (update.userId === myAuthId.current) return;
      targetPositions.current[update.userId] = { x: update.x, y: update.y };
    };

    const onChatMessage = (msg: ChatMessage) => {
      dispatch({ type: 'CHAT_MESSAGE', msg });
    };

    const onPadStateUpdate = (pads: PadState[]) => {
      if (!FOOTBALL_DUEL_ENABLED) return;
      setPadStates(pads);
    };

    const onDuelStarted = (payload: DuelStartedPayload) => {
      if (!FOOTBALL_DUEL_ENABLED) return;
      setActiveDuel(payload);
    };

    const onCrownUpdate = (crownData: CrownState) => {
      if (!FOOTBALL_DUEL_ENABLED) return;
      setCrownState(crownData.winnerId ? crownData : null);
    };

    const onError = (error: RealtimeError) => {
      console.error('[Realtime Error]:', error);
      if (error.code === 'AUTH_ERROR') {
        console.warn('[useRealtimeMap] Authentication error — clearing session');
        // Wipe the in-memory session. The AuthProvider will redirect on next
        // render via the router guard (or the user can navigate to /).
        logout().catch(() => undefined);
        return;
      }
      toast({
        variant: 'destructive',
        title: `Error: ${error.code}`,
        description: error.message,
      });
    };

    socket.on('initialPositions', onInitialPositions);
    socket.on('userJoined', onUserJoined);
    socket.on('userLeft', onUserLeft);
    socket.on('positionUpdate', onPositionUpdate);
    socket.on('chatMessage', onChatMessage);
    socket.on('error', onError);
    if (FOOTBALL_DUEL_ENABLED) {
      socket.on('padStateUpdate', onPadStateUpdate);
      socket.on('duelStarted', onDuelStarted);
      socket.on('crownUpdate', onCrownUpdate);
    }

    return () => {
      console.log('[useRealtimeMap] 🧹 Removing socket listeners');
      socket.off('initialPositions', onInitialPositions);
      socket.off('userJoined', onUserJoined);
      socket.off('userLeft', onUserLeft);
      socket.off('positionUpdate', onPositionUpdate);
      socket.off('chatMessage', onChatMessage);
      socket.off('error', onError);
      socket.off('padStateUpdate', onPadStateUpdate);
      socket.off('duelStarted', onDuelStarted);
      socket.off('crownUpdate', onCrownUpdate);
    };
  }, [socket]);

  // ── Join/leave map when connection state changes ──────────────────────────
  useEffect(() => {
    if (!socket) return;

    if (socketConnected) {
      dispatch({ type: 'CONNECTED' });
      if (!hasJoinedMap.current) {
        // Position will be sent by VirtualWorld via joinMapWithPosition
        socket.emit('joinMap');
        hasJoinedMap.current = true;
      }
    } else {
      if (!socket.connected && socket.disconnected) {
        socket.connect();
      }
      dispatch({ type: 'DISCONNECTED' });
      hasJoinedMap.current = false;
    }
  }, [socket, socketConnected]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const move = useCallback((x: number, y: number) => {
    if (!socket || !socketConnected) return;
    const now = Date.now();
    if (now - lastUpdateSent.current > THROTTLE_MS) {
      socket.emit('updatePosition', { x, y });
      lastUpdateSent.current = now;
    }
  }, [socket, socketConnected]);

  const sendMessage = useCallback((message: string) => {
    if (!socket || !socketConnected) return;
    socket.emit('sendChat', { message });
  }, [socket, socketConnected]);

  const checkDuelPads = useCallback((x: number, y: number) => {
    if (!FOOTBALL_DUEL_ENABLED) return;
    if (!socket || !socketConnected) return;
    const now = Date.now();
    if (now - lastPadCheckSent.current > PAD_CHECK_THROTTLE_MS) {
      socket.emit('checkDuelPads', { x, y });
      lastPadCheckSent.current = now;
    }
  }, [socket, socketConnected]);

  const clearActiveDuel = useCallback(() => {
    if (!FOOTBALL_DUEL_ENABLED) return;
    setActiveDuel(null);
  }, []);

  const joinMapWithPosition = useCallback((x: number, y: number) => {
    if (!socket?.connected) return;
    hasJoinedMap.current = false;
    socket.emit('joinMap', { x: Math.round(x), y: Math.round(y) });
    hasJoinedMap.current = true;
  }, [socket]);

  const rejoinMap = useCallback(() => {
    if (!socket?.connected) return;
    // Set hasJoinedMap BEFORE the timeout so the socketConnected effect
    // doesn't fire a duplicate joinMap while we're waiting.
    hasJoinedMap.current = true;
    setTimeout(() => {
      socket.emit('joinMap');
    }, 100);
  }, [socket]);

  return {
    users: state.users,
    chatHistory: state.chatHistory,
    isConnected: state.isConnected,
    myAuthId: myAuthId.current,
    targetPositions: targetPositions.current,
    move,
    sendMessage,
    padStates,
    crownState,
    activeDuel,
    checkDuelPads,
    clearActiveDuel,
    rejoinMap,
    joinMapWithPosition,
  };
};

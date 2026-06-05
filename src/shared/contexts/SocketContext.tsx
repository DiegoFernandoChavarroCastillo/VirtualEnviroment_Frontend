import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/features/virtual-world/types/realtime.types';
import { realTimeURL } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

const SOCKET_BASE_URL = import.meta.env.VITE_REALTIME_URL || realTimeURL;
const SOCKET_NAMESPACE = '/map';

/**
 * SocketProvider — owns the single `/map` socket for the app.
 *
 * Behaviour:
 *   - Connects only when there is an authenticated user (token present).
 *   - Recreates the socket when the token rotates (login / refresh / logout).
 *   - No `localStorage` polling. The token comes straight from the
 *     in-memory `AuthProvider`.
 *   - Without a token, the provider exposes `socket: null` so consumers
 *     can render an unauthenticated UI instead of attempting a connection
 *     that will be rejected with `AUTH_ERROR`.
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading: authLoading } = useAuth();
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Wait until the AuthProvider has attempted session restoration.
    if (authLoading) return;

    // Tear down any previous socket (logout, token rotation, etc.).
    if (socketRef.current) {
      console.log('[SocketProvider] Disposing previous socket');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    if (!token) {
      console.log('[SocketProvider] No token — socket left unconnected');
      return;
    }

    console.log('[SocketProvider] Creating socket with fresh token');
    const newSocket = io(`${SOCKET_BASE_URL}${SOCKET_NAMESPACE}`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      upgrade: false,
    });

    newSocket.on('connect', () => {
      console.log(`[Socket] Connected ✅ id=${newSocket.id}`);
      setIsConnected(true);
    });
    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error ❌:', err.message);
    });
    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [token, authLoading]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

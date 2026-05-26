import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/features/virtual-world/types/realtime.types';
import { realTimeURL } from '@/shared/lib/api';
import { authService } from '@/features/auth/services/auth.service';

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

const SOCKET_BASE_URL = import.meta.env.VITE_REALTIME_URL || realTimeURL;
const SOCKET_NAMESPACE = '/map';

function getConnectionToken(): string | null {
  const jwt = authService.getToken();
  if (jwt) return jwt;
  return localStorage.getItem('user_id');
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionToken, setConnectionToken] = useState<string | null>(() => getConnectionToken());
  const socketRef = useRef<Socket | null>(null);

  // Poll for token changes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getConnectionToken();
      setConnectionToken(prev => (prev !== current ? current : prev));
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      console.log('[SocketProvider] Token changed — tearing down previous socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    const token = connectionToken || 'guest-user';

    console.log('[SocketProvider] Creating socket →', `${SOCKET_BASE_URL}${SOCKET_NAMESPACE}`);

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
    newSocket.on('connect_error', (err) =>
      console.error('[Socket] Connection error ❌:', err.message));
    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });
    newSocket.on('reconnect_failed', () => {
      console.warn('[Socket] Reconnection failed — recreating socket');
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setTimeout(() => {
        const current = getConnectionToken();
        if (current) {
          setConnectionToken(current);
        }
      }, 2000);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [connectionToken]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('[SocketProvider] App unmounting — disconnecting socket');
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

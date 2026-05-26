export interface Position {
  x: number;
  y: number;
}

export interface UserInMap {
  userId: string;
  name: string;
  email?: string;
  color?: string; // Optional, set by client or defaults
  x: number;
  y: number;
  timestamp?: number;
}

export interface AvatarPosition {
  userId: string;
  name: string;
  email?: string;
  x: number;
  y: number;
  color?: string;
}

export interface ChatMessage {
  userId: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface PositionUpdate {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface RealtimeError {
  code: 'PROCESSING_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR';
  message: string;
  timestamp: number;
}

export interface ServerToClientEvents {
  userJoined: (payload: { userId: string; name: string; email: string; timestamp: number }) => void;
  userLeft: (payload: { userId: string; timestamp: number }) => void;
  positionUpdate: (payload: PositionUpdate) => void;
  chatMessage: (payload: ChatMessage) => void;
  initialPositions: (users: AvatarPosition[]) => void;
  error: (payload: RealtimeError) => void;
  // Football Duel events
  padStateUpdate: (pads: import('@/features/football-duel/types/football-duel.types').PadState[]) => void;
  duelStarted: (payload: import('@/features/football-duel/types/football-duel.types').DuelStartedPayload) => void;
  crownUpdate: (state: import('@/features/football-duel/types/football-duel.types').CrownState) => void;
  padBlocked: (payload: { padId: string }) => void;
  // Arena Shooter events
  shooterJoined: (payload: { roomId: string; players: import('@/features/arena-shooter/types/arena-shooter.types').ShooterPlayerInfo[] }) => void;
  zoneBlocked: () => void;
  roomState: (payload: { activePlayers: number; players: import('@/features/arena-shooter/types/arena-shooter.types').ShooterPlayerInfo[] }) => void;
}

export interface ClientToServerEvents {
  joinMap: (position?: { x: number; y: number }) => void;
  leaveMap: () => void;
  updatePosition: (position: Position) => void;
  sendChat: (payload: { message: string }) => void;
  // Football Duel events
  checkDuelPads: (position: Position) => void;
  // Arena Shooter events
  checkShooterZone: (position: Position) => void;
  clearShooterZone: () => void;
}

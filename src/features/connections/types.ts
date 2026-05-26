export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  createdAt: string;
}

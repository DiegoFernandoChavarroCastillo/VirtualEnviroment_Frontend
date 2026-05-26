import { Connection, ConnectionStatus } from '../types';

export const connectionsService = {
  async findAll(userId: string): Promise<Connection[]> {
    console.log(`[Mock ConnectionsService] findAll connections for user: ${userId}`);
    
    // Check if we have dynamic connections saved in localStorage to simulate sending requests
    // We can just return a mock list or read from a simulated list.
    const raw = localStorage.getItem('mock_connections');
    if (raw) {
      try {
        return JSON.parse(raw) as Connection[];
      } catch {
        // ignore
      }
    }
    
    // Default list: no connections initially
    return [];
  },

  async createConnectionRequest(requesterId: string, receiverId: string): Promise<Connection> {
    console.log(`[Mock ConnectionsService] createConnectionRequest from ${requesterId} to ${receiverId}`);
    const newConnection: Connection = {
      id: `conn_${Math.random().toString(36).substr(2, 9)}`,
      requesterId,
      receiverId,
      status: ConnectionStatus.PENDING,
      createdAt: new Date().toISOString(),
    };
    
    const existing = await this.findAll(requesterId);
    existing.push(newConnection);
    localStorage.setItem('mock_connections', JSON.stringify(existing));
    return newConnection;
  }
};

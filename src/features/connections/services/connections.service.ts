import { connectionsApi } from '@/shared/lib/api';
import { Connection } from '../types';

export const connectionsService = {
  async findAll(userId: string): Promise<Connection[]> {
    return connectionsApi.request<Connection[]>('/connections', { method: 'GET' });
  },

  async createConnectionRequest(requesterId: string, receiverId: string): Promise<Connection> {
    return connectionsApi.request<Connection>('/connections', {
      method: 'POST',
      body: { receiverId },
    });
  }
};
    
    const existing = await this.findAll(requesterId);
    existing.push(newConnection);
    localStorage.setItem('mock_connections', JSON.stringify(existing));
    return newConnection;
  }
};

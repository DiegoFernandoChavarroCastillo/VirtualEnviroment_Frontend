import { userApi } from '@/shared/lib/api';

export interface UserProfile {
  id: string;
  name: string;
  lastname?: string;
  email: string;
  description?: string;
  bio?: string;
  interests?: Array<{ id: string; name?: string }>;
  freeTimeSchedule?: Array<{ dayOfTheWeek: string; startsAt: string; endsAt: string }>;
  profilePicURL?: string;
  semester?: number;
  programs?: string[];
  role?: string;
}

interface BackendPublicUser {
  id: string;
  username: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

function mapBackendUser(u: BackendPublicUser): UserProfile {
  return {
    id: u.id,
    name: u.username,
    email: u.email,
  };
}

export const userService = {
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await userApi.request<BackendPublicUser>(`/users/${userId}`, { method: 'GET' });
      return mapBackendUser(user);
    } catch {
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return null;
  },

  async updatePresence(_userId: string, _isOnline: boolean): Promise<void> {
    return;
  },
};

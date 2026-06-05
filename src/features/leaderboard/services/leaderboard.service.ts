import { leaderboardApi } from '@/shared/lib/api';

export interface LeaderboardEntry {
  id: string;
  username: string;
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
  survivalTimeSeconds: number;
  highestStreak: number;
  score: number;
  playedAt: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export const leaderboardService = {
  async getGlobal(limit = 20): Promise<LeaderboardEntry[]> {
    const res = await leaderboardApi.request<LeaderboardEntry[] | { entries: LeaderboardEntry[] }>(
      `/leaderboard/global?limit=${limit}`,
      { method: 'GET' }
    );
    return Array.isArray(res) ? res : res.entries;
  },

  async getWeekly(limit = 20): Promise<LeaderboardEntry[]> {
    const res = await leaderboardApi.request<LeaderboardEntry[] | { entries: LeaderboardEntry[] }>(
      `/leaderboard/weekly?limit=${limit}`,
      { method: 'GET' }
    );
    return Array.isArray(res) ? res : res.entries;
  },

  async getDaily(limit = 20): Promise<LeaderboardEntry[]> {
    const res = await leaderboardApi.request<LeaderboardEntry[] | { entries: LeaderboardEntry[] }>(
      `/leaderboard/daily?limit=${limit}`,
      { method: 'GET' }
    );
    return Array.isArray(res) ? res : res.entries;
  },

  async getUserStats(username: string, limit = 10): Promise<LeaderboardEntry[]> {
    const res = await leaderboardApi.request<LeaderboardEntry[] | { entries: LeaderboardEntry[] }>(
      `/leaderboard/user/${encodeURIComponent(username)}?limit=${limit}`,
      { method: 'GET' }
    );
    return Array.isArray(res) ? res : res.entries;
  },
};

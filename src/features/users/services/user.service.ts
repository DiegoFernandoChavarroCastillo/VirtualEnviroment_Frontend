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

export const userService = {
  async getUserById(userId: string): Promise<UserProfile | null> {
    console.log(`[Mock UserService] getUserById: ${userId}`);

    const formattedName = userId
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');

    return {
      id: userId,
      name: formattedName,
      lastname: '',
      email: `${userId}@example.com`,
      description: '¡A jugar!',
      interests: [{ id: 'coding' }, { id: 'gaming' }],
      freeTimeSchedule: [
        { dayOfTheWeek: 'MONDAY', startsAt: '08:00:00', endsAt: '12:00:00' },
        { dayOfTheWeek: 'WEDNESDAY', startsAt: '14:00:00', endsAt: '18:00:00' },
      ],
      semester: 1,
      programs: ['Ingeniería de Sistemas'],
      role: 'USER',
    };
  },

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    console.log(`[Mock UserService] getUserByEmail: ${email}`);
    const localPart = email.split('@')[0] || 'usuario';
    return this.getUserById(localPart);
  },

  async updatePresence(_userId: string, _isOnline: boolean): Promise<void> {
    // no-op mock
  },
};

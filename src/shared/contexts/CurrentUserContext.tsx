import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { userService, type UserProfile } from '@/features/users/services/user.service';

interface AvailabilityBlock {
  day: string;
  start: string;
  end: string;
}

// Traduce nombres de días del backend al español
const DAY_MAP: Record<string, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Miér',
  THURSDAY: 'Jue', FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};
const toDay = (d: string) => DAY_MAP[d?.toUpperCase()] ?? d;

// Parsea ISO UTC o "HH:mm:ss" a "HH:mm"
const toTime = (raw: string | undefined): string => {
  if (!raw) return '--:--';
  if (raw.includes('T')) {
    if (raw.endsWith('Z') || raw.includes('+')) {
      const d = new Date(raw);
      if (!isNaN(d.getTime()))
        return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
    }
    return raw.substring(11, 16);
  }
  return raw.substring(0, 5);
};

type CurrentUserProfile = {
  bio: string;
  interests: string[];
  availability: AvailabilityBlock[];
};

const defaultProfile: CurrentUserProfile = {
  bio: 'Dev en progreso ☕💻 Buscando partners para hackathons y cafés. Semestre 6 y sobreviviendo.',
  interests: ['coding', 'coffee', 'music', 'gaming'],
  availability: [
    { day: 'Lun', start: '10:00', end: '12:00' },
    { day: 'Mar', start: '10:00', end: '12:00' },
    { day: 'Mié', start: '08:00', end: '10:00' },
    { day: 'Mié', start: '12:00', end: '14:00' },
    { day: 'Jue', start: '08:00', end: '10:00' },
    { day: 'Jue', start: '12:00', end: '14:00' },
  ],
};

const CurrentUserContext = createContext<{
  profile: CurrentUserProfile;
  updateProfile: (updates: Partial<CurrentUserProfile>) => void;
  userData: UserProfile | null;
  setUserData: (data: UserProfile | null) => void;
  isLoading: boolean;
} | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CurrentUserProfile>(defaultProfile);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateProfile = useCallback((updates: Partial<CurrentUserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const setUserDataAndPersist = useCallback((data: UserProfile | null) => {
    setUserData(data);
    if (data) {
      try {
        localStorage.setItem('user_data', JSON.stringify(data));
      } catch {
        /* ignore */
      }
    } else {
      localStorage.removeItem('user_data');
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      const userId = localStorage.getItem('user_id');
      console.log("[CurrentUserContext] Initializing session, found userId in local storage:", userId);

      if (userId) {
        try {
          console.log("[CurrentUserContext] Fetching full user data for session...");
          const user = await userService.getUserById(userId);
          if (user) {
            console.log("[CurrentUserContext] User data loaded successfully:", user.name);
            setUserDataAndPersist(user);
            setProfile({
              bio: user.description || '',
              interests: user.interests?.map(i => i.id) || [],
              availability: user.freeTimeSchedule?.map(f => ({
                day: toDay(f.dayOfTheWeek),
                start: toTime(f.startsAt),
                end: toTime(f.endsAt),
              })) || [],
            });
            // Marcar como online al cargar la sesión
            userService.updatePresence(userId, true);
          } else {
            console.warn("[CurrentUserContext] User not found in backend for ID:", userId);
          }
        } catch (error) {
          console.error('[CurrentUserContext] Error loading user data:', error);
        }
      } else {
        console.warn("[CurrentUserContext] No user_id found in localStorage. User not logged in?");
      }
      setIsLoading(false);
    };

    loadUserData();
  }, [setUserDataAndPersist]);

  return (
    <CurrentUserContext.Provider value={{ profile, updateProfile, userData, setUserData: setUserDataAndPersist, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return ctx;
}

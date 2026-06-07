import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { userService, type UserProfile } from '@/features/users/services/user.service';
import { useAuth } from '@/features/auth/contexts/AuthContext';

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
  bio: 'Dev en progreso | Buscando partners para hackathons y cafés. Semestre 6 y sobreviviendo.',
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

/**
 * CurrentUserProvider — UI-state of the current user's profile.
 *
 * Identity (who you are) is owned by `AuthProvider`. This provider only
 * fetches and exposes the rich profile (bio, interests, schedule) plus
 * a way to override it locally after edits.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CurrentUserProfile>(defaultProfile);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateProfile = useCallback((updates: Partial<CurrentUserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (authLoading) return;
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const fetched = await userService.getUserById(user.id);
        if (cancelled || !fetched) {
          setIsLoading(false);
          return;
        }
        setUserData(fetched);
        setProfile({
          bio: fetched.description || fetched.bio || '',
          interests: fetched.interests?.map(i => i.id) || [],
          availability: fetched.freeTimeSchedule?.map(f => ({
            day: toDay(f.dayOfTheWeek),
            start: toTime(f.startsAt),
            end: toTime(f.endsAt),
          })) || [],
        });
      } catch (error) {
        console.error('[CurrentUserContext] Error loading user data:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return (
    <CurrentUserContext.Provider value={{ profile, updateProfile, userData, setUserData, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return ctx;
}

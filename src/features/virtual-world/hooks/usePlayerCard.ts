import { useState, useCallback } from 'react';
import { userService, UserProfile } from '@/features/users/services/user.service';

export interface PlayerCardData {
  userId: string;
  profileId: string;
  name: string;
  profile: UserProfile | null;
  viewportX: number;
  viewportY: number;
}

export function usePlayerCard(currentUserId: string | null) {
  const [card, setCard] = useState<PlayerCardData | null>(null);
  const [loading, setLoading] = useState(false);

  const openCard = useCallback(
    async (
      userId: string,
      name: string,
      viewportX: number,
      viewportY: number,
      email?: string,
    ) => {
      if (card?.userId === userId) {
        setCard(null);
        return;
      }

      setLoading(true);
      setCard(null);

      try {
        const profilePromise = email
          ? userService.getUserByEmail(email)
          : userService.getUserById(userId);

        const profile = await profilePromise.catch(() => null);
        const profileId = profile?.id ?? userId;

        setCard({ userId, profileId, name, profile, viewportX, viewportY });
      } catch {
        setCard({ userId, profileId: userId, name, profile: null, viewportX, viewportY });
      } finally {
        setLoading(false);
      }
    },
    [card?.userId],
  );

  const closeCard = useCallback(() => setCard(null), []);

  return { card, loading, openCard, closeCard };
}

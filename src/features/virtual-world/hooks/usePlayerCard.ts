import { useState, useCallback } from 'react';
import { userService, UserProfile } from '@/features/users/services/user.service';
import { connectionsService } from '@/features/connections/services/connections.service';
import { ConnectionStatus } from '@/features/connections/types';

export type CardConnectionState =
  | 'none'       // no connection exists
  | 'pending'    // request sent, waiting
  | 'connected'; // already connected (ACCEPTED)

export interface PlayerCardData {
  /** Auth ID (JWT sub) — used to match connections */
  userId: string;
  /** User-management service ID — used for profile navigation and getUserById */
  profileId: string;
  name: string;
  profile: UserProfile | null;
  connectionState: CardConnectionState;
  connectionId: string | null;
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
      // Toggle off if clicking the same user again
      if (card?.userId === userId) {
        setCard(null);
        return;
      }

      setLoading(true);
      setCard(null);

      try {
        // Resolve the user-management profile.
        // The map uses auth IDs (JWT sub), but the user-management service uses its own IDs.
        // If we have the email (always present in UserInMap), use getUserByEmail which is reliable.
        // Fall back to getUserById only if email is missing.
        const profilePromise = email
          ? userService.getUserByEmail(email)
          : userService.getUserById(userId);

        const [profile, connections] = await Promise.all([
          profilePromise.catch(() => null),
          currentUserId
            ? connectionsService.findAll(currentUserId).catch(() => [])
            : Promise.resolve([]),
        ]);

        // The profile ID from user-management (used for navigation)
        const profileId = profile?.id ?? userId;

        // Determine connection state.
        // Connections store user-management IDs, so compare against the
        // current user id (passed in via the hook prop — sourced from the
        // AuthProvider, not from localStorage).
        let connectionState: CardConnectionState = 'none';
        let connectionId: string | null = null;

        const myProfileId = currentUserId;

        const match = connections.find(
          (c) =>
            (c.requesterId === myProfileId && c.receiverId === profileId) ||
            (c.requesterId === profileId && c.receiverId === myProfileId),
        );

        if (match) {
          connectionId = match.id;
          if (match.status === ConnectionStatus.ACCEPTED) {
            connectionState = 'connected';
          } else if (match.status === ConnectionStatus.PENDING) {
            connectionState = 'pending';
          }
        }

        setCard({ userId, profileId, name, profile, connectionState, connectionId, viewportX, viewportY });
      } catch {
        setCard({
          userId,
          profileId: userId,
          name,
          profile: null,
          connectionState: 'none',
          connectionId: null,
          viewportX,
          viewportY,
        });
      } finally {
        setLoading(false);
      }
    },
    [card?.userId, currentUserId],
  );

  const closeCard = useCallback(() => setCard(null), []);

  const markConnected = useCallback(() => {
    setCard((prev) => prev ? { ...prev, connectionState: 'pending' } : prev);
  }, []);

  return { card, loading, openCard, closeCard, markConnected };
}

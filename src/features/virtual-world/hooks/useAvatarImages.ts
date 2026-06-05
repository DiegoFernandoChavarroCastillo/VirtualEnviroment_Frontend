import { useRef, useCallback } from 'react';
import { userService } from '@/features/users/services/user.service';
import { resolveProfilePicUrl } from '@/shared/utils/resolveProfilePicUrl';

/**
 * Cache de avatares keyed por userId del mapa (JWT sub). El perfil siempre
 * se resuelve contra la API; no se persiste nada en localStorage.
 */
type ImageCache = Map<string, HTMLImageElement | null>;

const MAX_LOAD_ATTEMPTS = 2;

export function useAvatarImages() {
  const cache = useRef<ImageCache>(new Map());
  const pending = useRef<Set<string>>(new Set());
  const loadAttempts = useRef<Map<string, number>>(new Map());

  const loadImage = useCallback((userId: string, url: string) => {
    const resolved = resolveProfilePicUrl(url);
    if (!resolved) {
      cache.current.set(userId, null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      loadAttempts.current.delete(userId);
      cache.current.set(userId, img);
    };
    img.onerror = () => {
      const attempts = (loadAttempts.current.get(userId) ?? 0) + 1;
      loadAttempts.current.set(userId, attempts);
      if (attempts >= MAX_LOAD_ATTEMPTS) {
        cache.current.set(userId, null);
      } else {
        cache.current.delete(userId);
      }
    };
    img.src = resolved;
    cache.current.set(userId, img);
  }, []);

  /**
   * Jugador local: perfil fresco desde API (user-management id + email).
   */
  const preloadLocalUser = useCallback((userMgmtId: string, email?: string) => {
    if (cache.current.has(userMgmtId) || pending.current.has(userMgmtId)) return;

    pending.current.add(userMgmtId);

    const applyProfile = (profilePicURL?: string) => {
      pending.current.delete(userMgmtId);
      if (!profilePicURL) {
        cache.current.set(userMgmtId, null);
        return;
      }
      loadImage(userMgmtId, profilePicURL);
    };

    const fetchProfile = email
      ? userService.getUserByEmail(email)
      : userService.getUserById(userMgmtId);

    fetchProfile
      .then((profile) => {
        if (profile) {
          applyProfile(profile.profilePicURL);
          return;
        }
        applyProfile(undefined);
      })
      .catch(() => {
        applyProfile(undefined);
      });
  }, [loadImage]);

  /**
   * Jugadores remotos: userId = JWT sub del mapa; se resuelve perfil por email.
   */
  const ensureRemoteUser = useCallback((userId: string, email?: string) => {
    if (cache.current.has(userId) || pending.current.has(userId)) return;
    if (!email?.trim()) {
      cache.current.set(userId, null);
      return;
    }

    pending.current.add(userId);

    userService
      .getUserByEmail(email.trim())
      .then((profile) => {
        pending.current.delete(userId);
        if (!profile?.profilePicURL) {
          cache.current.set(userId, null);
          return;
        }
        loadImage(userId, profile.profilePicURL);
      })
      .catch(() => {
        pending.current.delete(userId);
        cache.current.set(userId, null);
      });
  }, [loadImage]);

  const getImage = useCallback((userId: string): HTMLImageElement | null => {
    const img = cache.current.get(userId);
    if (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
    pending.current.clear();
    loadAttempts.current.clear();
  }, []);

  return { preloadLocalUser, ensureRemoteUser, getImage, clearCache };
}


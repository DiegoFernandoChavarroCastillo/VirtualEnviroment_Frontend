const userMgmtBase = (import.meta.env.VITE_USER_MGMT_URL ?? '').replace(/\/$/, '');

/**
 * Convierte profilePicURL del API a una URL cargable en el navegador.
 * - Rutas relativas (/uploads/avatars/...) → se anteponen VITE_USER_MGMT_URL
 * - URLs antiguas con localhost u otro host incorrecto → se reescriben al API de usuarios
 * - data:, blob: y URLs externas (ej. ui-avatars) se devuelven sin cambios
 */
export function resolveProfilePicUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;

  const trimmed = url.trim();

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const avatarIndex = trimmed.indexOf('/uploads/avatars/');
  if (avatarIndex !== -1 && userMgmtBase) {
    let path = trimmed.substring(avatarIndex);
    // Remove query params or hashes
    const qIndex = path.indexOf('?');
    if (qIndex !== -1) path = path.substring(0, qIndex);
    const hIndex = path.indexOf('#');
    if (hIndex !== -1) path = path.substring(0, hIndex);
    return `${userMgmtBase}${path}`;
  }

  if (trimmed.startsWith('/uploads/')) {
    if (!userMgmtBase) {
      console.warn('[resolveProfilePicUrl] VITE_USER_MGMT_URL no está definida');
      return undefined;
    }
    return `${userMgmtBase}${trimmed}`;
  }

  return trimmed;
}

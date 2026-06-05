/**
 * Resolves a profile picture URL for display in the browser.
 *
 * Historically this rewrote relative paths from the user-management
 * microservice by prepending `VITE_USER_MGMT_URL`. That microservice no
 * longer exists — the realtime backend is the only service. Avatars in the
 * virtual world are rendered from a colour (set at registration), so this
 * function now only validates the URL and lets callers decide what to do
 * with it.
 */
export function resolveProfilePicUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;

  const trimmed = url.trim();

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // No avatar service to attach relative paths to. Return as-is; consumers
  // (e.g. <img>) will fail gracefully.
  return trimmed;
}

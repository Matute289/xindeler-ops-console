// OC-82 / ZG-78: see totpFreshness.native.ts for the shared TOTP-replay background.
//
// OC-94: web needs this backed by `localStorage`, not an in-memory variable like native's.
// `enroll.tsx` is only ever reached via an email invite link — on web that always triggers a
// full page reload (confirmed experimentally, OC-93), wiping any in-memory JS state before the
// screen can read it. `localStorage` survives that reload, and — since an email client normally
// opens the link in a brand new tab, not the tab the operator was already using — it also needs
// to survive that, which rules out `sessionStorage` (scoped per-tab, not per-origin). Same
// mechanism `SecureSessionStorage.web.ts` already uses for the session token (OC-85), for the
// same reason: this platform has no in-memory state that reliably outlives a navigation.
const STORAGE_KEY = 'overlord.totpFreshness.lastConsumedAt';

export function markTotpConsumed(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

// Matches the gateway's own 30-second TOTP step.
const FRESHNESS_WINDOW_MS = 30_000;

export function wasTotpRecentlyConsumed(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return false;
  const lastConsumedAt = Number(stored);
  return Number.isFinite(lastConsumedAt) && Date.now() - lastConsumedAt < FRESHNESS_WINDOW_MS;
}

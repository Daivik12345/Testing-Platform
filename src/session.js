// UI-session persistence for the existing demo login, not an authorization boundary.
export const SESSION_KEY = 'focus-session-v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
export function readSession(storage, now = Date.now()) {
  try {
    const data = JSON.parse(storage.getItem(SESSION_KEY));
    if (!data || data.expiresAt <= now || !Number.isFinite(data.expiresAt)) return null;
    if (!((data.role === 'admin' && data.name === 'Daivik') || (data.role === 'student' && data.name === 'Soumya Sharma'))) return null;
    return {role:data.role, name:data.name};
  } catch { return null; }
}
export function saveSession(storage, user, now = Date.now()) {
  try { storage.setItem(SESSION_KEY, JSON.stringify({...user, expiresAt:now + TTL})); return true; }
  catch { return false; }
}
export function clearSession(storage) { try { storage.removeItem(SESSION_KEY); } catch { /* Storage unavailable. */ } }

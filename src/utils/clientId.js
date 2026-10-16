// A random id kept in this browser, sent when joining a room. For guests (who have no account) it is how a
// class activity knows it is the same person after a reconnect, so a refresh does not let them answer twice.
const KEY = "boardly-client-id";

export function getClientId() {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`; // storage blocked: still unique for this tab
  }
}

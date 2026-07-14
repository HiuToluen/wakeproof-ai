const listeners = new Set();

export function subscribeActiveSessionRefresh(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function requestActiveSessionRefresh() {
  const results = await Promise.all(Array.from(listeners, (listener) => listener({ authoritative: true })));
  return results.find((session) => session !== undefined) ?? null;
}

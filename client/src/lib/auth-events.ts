/**
 * Tiny pub/sub so the react-query layer can tell AuthProvider that the server
 * rejected a request as unauthenticated. Lives in its own module to keep
 * queryClient.ts and auth.tsx from importing each other.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  listeners.forEach((listener) => listener());
}

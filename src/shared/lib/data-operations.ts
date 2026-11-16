let pending: Promise<unknown> = Promise.resolve();
let busy = false;
const subscribers = new Set<(value: boolean) => void>();

export function enqueueDataOperation<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation);
  pending = next.catch(() => {});
  return next;
}

export async function waitForDataOperations(): Promise<void> { await pending; }
export function isSynchronizing(): boolean { return busy; }
export function onSynchronizationChanged(listener: (value: boolean) => void): () => void {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}

export async function withEditingLocked<T>(operation: () => Promise<T>): Promise<T> {
  busy = true;
  for (const listener of subscribers) listener(true);
  try { return await operation(); }
  finally { busy = false; for (const listener of subscribers) listener(false); }
}

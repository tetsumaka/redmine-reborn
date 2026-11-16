const subscriptions = new Set<() => void>();
export function onIssueEventsChanged(listener: () => void): () => void {
  subscriptions.add(listener);
  return () => { subscriptions.delete(listener); };
}
export function issueEventsChanged(): void { for (const listener of subscriptions) listener(); }

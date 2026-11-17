/** New service workers may activate only when the IndexedDB queue is empty. */
export function canActivateWorker(pending: number): boolean {
  return pending === 0;
}

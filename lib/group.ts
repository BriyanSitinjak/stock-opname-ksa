export function groupBy<T, K>(items: readonly T[], key: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const id = key(item);
    const list = map.get(id) ?? [];
    list.push(item);
    map.set(id, list);
  }
  return map;
}

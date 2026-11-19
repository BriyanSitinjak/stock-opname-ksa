export type SessionScope = {
  included: string[];
  excluded: string[];
  groups: string[];
  periode: string;
  snapshot_at: string;
};

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function countedTitle(label: string, count: number) {
  return count > 0 ? `${label} · ${count}` : label;
}

export function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

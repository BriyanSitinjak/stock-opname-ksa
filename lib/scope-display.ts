import { DEFAULT_BRANDS, DEFAULT_GROUPS } from "@/lib/setup";

export function scopeDisplay(scope: { brands?: string[]; groups?: string[] }, periode: string, snapshotAt: Date) {
  const included = scope.brands ?? [];
  const excluded = DEFAULT_BRANDS.filter((brand) => !included.includes(brand));
  const groups = scope.groups ?? DEFAULT_GROUPS;
  return {
    included,
    excluded,
    groups,
    periode,
    snapshot_at: snapshotAt.toISOString(),
  };
}

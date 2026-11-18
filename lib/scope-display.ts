import { catalogNames } from "@/lib/setup";

export type ScopeFilter = { brands?: string[]; groups?: string[] };

export function readScope(value: unknown): { brands: string[]; groups: string[] } {
  const scope = (value && typeof value === "object" ? value : {}) as ScopeFilter;
  return { brands: scope.brands ?? [], groups: scope.groups ?? [] };
}

export async function displayedScope(session: { scopeFilter: unknown; periode: string; snapshotAt: Date }) {
  const scope = readScope(session.scopeFilter);
  const names = await catalogNames();
  return {
    included: scope.brands,
    excluded: names.brands.filter((brand) => !scope.brands.includes(brand)),
    groups: scope.groups,
    periode: session.periode,
    snapshot_at: session.snapshotAt.toISOString(),
  };
}

export const ROLES = ["admin", "reviewer", "counter"] as const;

export type StaffRole = (typeof ROLES)[number];

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  counter: "Petugas",
};

export function parseRole(value: unknown): StaffRole | null {
  return typeof value === "string" && ROLES.some((role) => role === value) ? (value as StaffRole) : null;
}

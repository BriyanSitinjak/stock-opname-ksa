/** Two-letter initials from a full name for dense denah cells. */
export function nameInitials(nama: string | null | undefined): string {
  const parts = (nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

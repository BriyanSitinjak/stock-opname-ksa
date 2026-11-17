export function qtyOrDash(value: string | null | undefined) {
  return value == null || value === "" ? "—" : value;
}

export function decString(value: unknown): string | null {
  return value == null ? null : String(value);
}

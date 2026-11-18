const IMPORT_KINDS = [".csv", ".xls", ".xlsx"] as const;

export const IMPORT_ACCEPT = IMPORT_KINDS.join(",");

export function importFileList(conjunction: "dan" | "atau") {
  const last = IMPORT_KINDS[IMPORT_KINDS.length - 1];
  return `${IMPORT_KINDS.slice(0, -1).join(", ")}, ${conjunction} ${last}`;
}

export function excelSafe(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function asExcelText(value: unknown) {
  if (value == null) {
    return "";
  }
  return excelSafe(String(value));
}

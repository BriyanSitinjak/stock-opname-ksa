// Entity ids are prefix-number text: usr-1, ses-1, tag-11, itm-1234.
// The prefix is the table. The number is the sequence. client_row_id stays uuid.

export type IdPrefix =
  | "usr"
  | "gdg"
  | "lok"
  | "tag"
  | "ses"
  | "imp"
  | "itm"
  | "asg"
  | "cnt"
  | "sub"
  | "unk"
  | "apv"
  | "rop";

export function idPattern(prefix: IdPrefix): RegExp {
  return new RegExp(`^${prefix}-[1-9][0-9]*$`);
}

export function parseId(value: unknown, prefix: IdPrefix): string | null {
  if (typeof value !== "string" || !idPattern(prefix).test(value)) return null;
  return value;
}

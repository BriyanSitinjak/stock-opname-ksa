"use client";

import { Select } from "@/app/siap/ui";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";

export type CounterOption = { id: string; nama: string; role?: StaffRole };

export function PassSelect({
  counters,
  value,
  disabled,
  onChange,
}: {
  counters: CounterOption[];
  value: string | null;
  disabled?: boolean;
  onChange: (userId: string) => void;
}) {
  return (
    <Select className="w-full" value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {counters.map((counter) => (
        <option key={counter.id} value={counter.id}>
          {counter.role ? `${counter.nama} · ${ROLE_LABEL[counter.role]}` : counter.nama}
        </option>
      ))}
    </Select>
  );
}

"use client";

import { EmptyState } from "@/app/empty-state";
import { useSiapQuery } from "@/app/siap/query";
import { formatDateTime } from "@/app/siap/format";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { ErrorText } from "@/app/siap/ui";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";

type ActionRow = {
  id: string;
  summary: string;
  created_at: string;
  actor_nama: string;
  actor_role: StaffRole;
};

export function RiwayatBoard() {
  const history = useSiapQuery<{ actions: ActionRow[] }>("/api/staff-actions");
  const rows = history.data?.actions ?? null;
  const error = history.isError ? "Riwayat belum bisa dimuat." : "";

  if (error) {
    return <ErrorText>{error}</ErrorText>;
  }
  if (rows == null) {
    return null;
  }
  if (rows.length === 0) {
    return <EmptyState menu="riwayat" />;
  }
  return (
    <ReportTable title="Tindakan terakhir" headers={["Waktu", "Akun", "Role", "Aksi"]}>
      {rows.map((row) => (
        <ReportRow key={row.id}>
          <Td className="whitespace-nowrap">{formatDateTime(row.created_at)}</Td>
          <Td className="font-medium">{row.actor_nama}</Td>
          <Td>{ROLE_LABEL[row.actor_role]}</Td>
          <Td>{row.summary}</Td>
        </ReportRow>
      ))}
    </ReportTable>
  );
}

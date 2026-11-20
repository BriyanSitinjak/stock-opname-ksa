"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/app/empty-state";
import { fetchJson } from "@/app/siap/api";
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
  const [rows, setRows] = useState<ActionRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchJson<{ actions: ActionRow[] }>("/api/staff-actions").then(({ ok, data }) => {
      if (cancelled) {
        return;
      }
      if (!ok) {
        setError("Riwayat belum bisa dimuat.");
        setRows([]);
        return;
      }
      setRows(data.actions);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows == null) {
    return null;
  }
  if (error) {
    return <ErrorText>{error}</ErrorText>;
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

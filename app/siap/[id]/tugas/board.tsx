"use client";

import { useEffect, useMemo, useState } from "react";
import { samePersonOnBothPasses } from "@/lib/assignment-rules";
import { fetchJson } from "@/app/siap/api";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { BackLink, ErrorText, MissingList, TealButton } from "@/app/siap/ui";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";

type Counter = { id: string; nama: string; role?: StaffRole };
type Row = {
  tag_id: string;
  nomor: string;
  lokasi: string;
  gudang: string;
  pass_1: string | null;
  pass_2: string | null;
};

async function fetchBoard(id: string) {
  const [assign, catalog] = await Promise.all([
    fetchJson<Row[]>(`/api/sessions/${id}/assignments`),
    fetchJson<{ counters: Counter[] }>("/api/setup/catalog"),
  ]);
  return {
    rows: assign.ok ? assign.data : [],
    counters: catalog.ok ? catalog.data.counters : [],
  };
}

function PassSelect({
  counters,
  value,
  onChange,
}: {
  counters: Counter[];
  value: string | null;
  onChange: (userId: string) => void;
}) {
  return (
    <select className="w-full rounded-lg border px-2 py-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {counters.map((counter) => (
        <option key={counter.id} value={counter.id}>
          {counter.role ? `${counter.nama} · ${ROLE_LABEL[counter.role]}` : counter.nama}
        </option>
      ))}
    </select>
  );
}

export function TugasBoard({ id }: { id: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchBoard(id).then((board) => {
      if (!cancelled) {
        setRows(board.rows);
        setCounters(board.counters);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const list = map.get(row.gudang) ?? [];
      list.push(row);
      map.set(row.gudang, list);
    }
    return [...map.entries()];
  }, [rows]);

  function setPass(tagId: string, pass: 1 | 2, userId: string) {
    setError("");
    setRows((current) =>
      current.map((row) => {
        if (row.tag_id !== tagId) {
          return row;
        }
        const next = { ...row, [pass === 1 ? "pass_1" : "pass_2"]: userId || null };
        const clash = samePersonOnBothPasses([
          ...(next.pass_1 ? [{ tag_id: next.tag_id, pass: 1, user_id: next.pass_1 }] : []),
          ...(next.pass_2 ? [{ tag_id: next.tag_id, pass: 2, user_id: next.pass_2 }] : []),
        ]);
        if (clash) {
          setError(`Tag ${row.nomor}: orang yang sama tidak boleh mengisi kedua kolom.`);
          return row;
        }
        return next;
      }),
    );
  }

  async function save() {
    setError("");
    setMessage("");
    const assignments = rows.flatMap((row) => {
      const out: { tag_id: string; pass: number; user_id: string }[] = [];
      if (row.pass_1) {
        out.push({ tag_id: row.tag_id, pass: 1, user_id: row.pass_1 });
      }
      if (row.pass_2) {
        out.push({ tag_id: row.tag_id, pass: 2, user_id: row.pass_2 });
      }
      return out;
    });
    const clash = samePersonOnBothPasses(assignments);
    if (clash) {
      setError(clash);
      return;
    }
    const { ok, data } = await fetchJson<{ error?: string; missing_assignments?: string[] }>(`/api/sessions/${id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    if (!ok) {
      setError(data.error ?? "Gagal menyimpan tugas.");
      return;
    }
    setMissing(data.missing_assignments ?? []);
    setMessage("Tugas tersimpan.");
  }

  return (
    <>
      <BackLink href={`/siap/${id}`} />
      <h1 className="mt-3 text-2xl font-semibold">Bagi tugas</h1>
      <p className="mt-1 text-sm text-[#6b6b6b]">Dua kolom per tag. Orang yang sama ditolak di kedua pass. Nama baru ditambah di Pengguna.</p>
      {grouped.map(([gudang, tags]) => (
        <section key={gudang} className="mt-8">
          <h2 className="mb-3 font-medium">{gudang}</h2>
          <ReportTable headers={["Tag", "Lokasi", "Hitung ke-1", "Hitung ke-2"]}>
            {tags.map((row) => (
              <ReportRow key={row.tag_id}>
                <Td className="font-medium">{row.nomor}</Td>
                <Td>{row.lokasi}</Td>
                <Td>
                  <PassSelect counters={counters} value={row.pass_1} onChange={(userId) => setPass(row.tag_id, 1, userId)} />
                </Td>
                <Td>
                  <PassSelect counters={counters} value={row.pass_2} onChange={(userId) => setPass(row.tag_id, 2, userId)} />
                </Td>
              </ReportRow>
            ))}
          </ReportTable>
        </section>
      ))}
      <ErrorText>{error}</ErrorText>
      {message ? <p className="mt-4 text-sm text-ksa-teal-deep">{message}</p> : null}
      <MissingList items={missing} />
      <TealButton className="mt-6 px-6 py-3" onClick={() => void save()}>
        Simpan tugas
      </TealButton>
    </>
  );
}

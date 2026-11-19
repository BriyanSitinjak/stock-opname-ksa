"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/app/siap/api";
import { Card, ErrorText, Field, ScopeTicks, TealButton, TextInput, toggleValue } from "@/app/siap/ui";
import { toast } from "@/app/toast";

export default function SesiBaruPage() {
  const router = useRouter();
  const [nama, setNama] = useState("Stock Opname Tahunan 2026");
  const [periode, setPeriode] = useState("2026-12");
  const [snapshotAt, setSnapshotAt] = useState("2026-12-15T18:00");
  const [brands, setBrands] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<{ brands: string[]; groups: string[] }>({ brands: [], groups: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<{ brands: string[]; groups: string[] }>("/api/setup/catalog").then(({ ok, data }) => {
      if (!cancelled && ok) {
        setCatalog(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setBusy(true);
    setError("");
    const { ok, data } = await fetchJson<{ id?: string; error?: string }>("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama,
        periode,
        snapshot_at: new Date(snapshotAt).toISOString(),
        brands,
        groups,
      }),
    });
    setBusy(false);
    if (!ok || !data.id) {
      toast(data.error ?? "Gagal membuat sesi.", setError);
      return;
    }
    toast("Sesi tersimpan.");
    router.push(`/siap/${data.id}`);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Sesi baru</h1>
      <Card className="mt-6 max-w-xl">
        <Field label="Nama sesi">
          <TextInput value={nama} onChange={(e) => setNama(e.target.value)} />
        </Field>
        <Field label="Periode">
          <TextInput value={periode} onChange={(e) => setPeriode(e.target.value)} />
        </Field>
        <Field label="Waktu cut off">
          <TextInput type="datetime-local" value={snapshotAt} onChange={(e) => setSnapshotAt(e.target.value)} />
        </Field>
        {catalog.brands.length === 0 && catalog.groups.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b6b6b]">Brand dan group muncul setelah file di-import.</p>
        ) : (
          <>
            <ScopeTicks
              legend="Brand yang dihitung"
              options={catalog.brands}
              selected={brands}
              onToggle={(value) => setBrands(toggleValue(brands, value))}
            />
            <ScopeTicks
              legend="Group yang dihitung"
              options={catalog.groups}
              selected={groups}
              onToggle={(value) => setGroups(toggleValue(groups, value))}
            />
          </>
        )}
        <ErrorText>{error}</ErrorText>
        <TealButton disabled={busy} className="mt-6 w-full py-3" onClick={() => void submit()}>
          Simpan sesi
        </TealButton>
      </Card>
    </>
  );
}

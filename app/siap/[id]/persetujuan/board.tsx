"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { BackLink, ErrorText, Field, Select, TealButton, TextInput } from "@/app/siap/ui";
import { toast } from "@/app/toast";

type Actor = { id: string; nama: string; role: string };
type Approval = { step: number; nama: string; approved_at: string; catatan: string | null };
type OpenTag = { nomor: string; href: string; status: string };
type Detail = {
  id: string;
  nama: string;
  status: string;
  scope: {
    included: string[];
    excluded: string[];
    groups: string[];
    periode: string;
    snapshot_at: string;
  };
  review: { ready: boolean; open_tags: OpenTag[]; selisih_hitung: number };
  approvals: Approval[];
  actors: Actor[];
};

export function PersetujuanBoard({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [actorId, setActorId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { ok, data } = await fetchJson<Detail>(`/api/sessions/${id}`);
    if (ok) {
      setDetail(data);
      setActorId((current) => current || data.actors[0]?.id || "");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetchJson<Detail>(`/api/sessions/${id}`).then(({ ok, data }) => {
      if (!cancelled && ok) {
        setDetail(data);
        setActorId((current) => current || data.actors[0]?.id || "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function post(path: string, body: Record<string, unknown>) {
    setError("");
    const { ok, data } = await fetchJson<{ error?: string; status?: string }>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-actor-id": actorId },
      body: JSON.stringify(body),
    });
    if (!ok) {
      toast(data.error ?? "Gagal.", setError);
      await load();
      return;
    }
    toast("Tersimpan.");
    await load();
  }

  async function download(kind: "xlsx" | "pdf") {
    setError("");
    const response = await fetch(`/api/sessions/${id}/export.${kind}`);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      toast(data.error ?? "Gagal download.", setError);
      return;
    }
    toast("File sudah di-download.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `opname.${kind}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!detail) {
    return <p>Memuat…</p>;
  }

  const step1 = detail.approvals.find((row) => row.step === 1);
  const step2 = detail.approvals.find((row) => row.step === 2);
  const scope = detail.scope;

  return (
    <>
      <BackLink href={`/siap/${id}`} />
      <h1 className="mt-3 text-2xl font-semibold">{detail.nama}</h1>
      <p className="text-sm text-[#6b6b6b]">Persetujuan</p>
      <p className="mt-1 text-sm">
        Status: <span className="font-medium">{detail.status}</span>
      </p>

      <div className="mt-6 space-y-2 text-base">
        <p>Brand yang dihitung: {scope.included.join(", ") || "—"}</p>
        <p>Brand di luar scope: {scope.excluded.join(", ") || "—"}</p>
        <p>Periode: {scope.periode}</p>
        <p>Cut off: {scope.snapshot_at}</p>
        <p>Group: {scope.groups.join(", ")}</p>
      </div>

      {detail.review.open_tags.length > 0 ? (
        <ul className="mt-4 rounded-2xl bg-[#f3d4a0] p-4 text-base">
          {detail.review.open_tags.map((tag) => (
            <li key={tag.nomor}>
              <Link className="text-ksa-teal-deep" href={tag.href}>
                Tag {tag.nomor}
              </Link>{" "}
              count belum selesai
            </li>
          ))}
        </ul>
      ) : null}
      {detail.review.selisih_hitung > 0 ? (
        <p className="mt-3 text-base">
          <Link className="text-ksa-teal-deep" href={`/siap/${id}/laporan/selisih-hitung`}>
            {detail.review.selisih_hitung} selisih hitung
          </Link>{" "}
          masih terbuka.
        </p>
      ) : null}

      <Field label="Petugas">
        <Select className="mt-1 w-full" value={actorId} onChange={(event) => setActorId(event.target.value)}>
          {detail.actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.nama} ({actor.role})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Catatan persetujuan">
        <TextInput value={catatan} onChange={(event) => setCatatan(event.target.value)} />
      </Field>

      <div className="mt-6 flex flex-wrap gap-3">
        <TealButton className="px-6 py-3" disabled={detail.status !== "counting"} onClick={() => void post(`/api/sessions/${id}/review`, {})}>
          Kirim ke review
        </TealButton>
        <TealButton
          className="px-6 py-3"
          disabled={detail.status !== "review" || Boolean(step1)}
          onClick={() => void post(`/api/sessions/${id}/approve`, { step: 1, actor_id: actorId, catatan })}
        >
          Approve step 1
        </TealButton>
        <TealButton
          className="px-6 py-3"
          disabled={detail.status !== "review" || !step1 || Boolean(step2)}
          onClick={() => void post(`/api/sessions/${id}/approve`, { step: 2, actor_id: actorId, catatan })}
        >
          Approve step 2
        </TealButton>
      </div>

      <p className="mt-4 text-sm text-[#6b6b6b]">
        {step1 ? `Step 1: ${step1.nama}` : "Step 1 belum ada."} · {step2 ? `Step 2: ${step2.nama}` : "Step 2 belum ada."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <TealButton className="px-6 py-3" disabled={detail.status !== "approved" && detail.status !== "closed"} onClick={() => void download("xlsx")}>
          Download Excel
        </TealButton>
        <TealButton className="px-6 py-3" disabled={detail.status !== "approved" && detail.status !== "closed"} onClick={() => void download("pdf")}>
          Download PDF
        </TealButton>
        <TealButton className="px-6 py-3" disabled={detail.status !== "approved"} onClick={() => void post(`/api/sessions/${id}/close`, {})}>
          Tutup sesi
        </TealButton>
      </div>

      <Field label="Alasan reopen">
        <TextInput value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
      <TealButton
        className="mt-3 px-6 py-3"
        disabled={detail.status !== "approved" && detail.status !== "closed"}
        onClick={() => void post(`/api/sessions/${id}/reopen`, { actor_id: actorId, reason })}
      >
        Reopen
      </TealButton>

      <ErrorText>{error}</ErrorText>
    </>
  );
}

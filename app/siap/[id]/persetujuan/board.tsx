"use client";

import {
  BadgeCheck,
  CalendarDays,
  CircleDot,
  Clock,
  FileDown,
  RotateCcw,
  Send,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { confirm } from "@/app/confirm";
import { fetchJson } from "@/app/siap/api";
import { LoadingMark } from "@/app/loading-mark";
import { formatDateTime, type SessionScope } from "@/app/siap/format";
import { BackLink, Card, ErrorText, Field, IconLabel, InfoCard, OutlineButton, PageLead, ScopeLists, TealButton, TextInput } from "@/app/siap/ui";
import { toast } from "@/app/toast";
import { ROLE_LABEL } from "@/lib/roles";
import type { StaffSession } from "@/lib/staff-auth";

type Approval = { step: number; nama: string; approved_at: string; catatan: string | null };
type OpenTag = { nomor: string; href: string; status: string };
type Detail = {
  id: string;
  nama: string;
  status: string;
  scope: SessionScope;
  review: { ready: boolean; open_tags: OpenTag[]; selisih_hitung: number };
  approvals: Approval[];
};

export function PersetujuanBoard({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [me, setMe] = useState<StaffSession | null>(null);
  const [catatan, setCatatan] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { ok, data } = await fetchJson<Detail>(`/api/sessions/${id}`);
    if (ok) {
      setDetail(data);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetchJson<Detail>(`/api/sessions/${id}`).then(({ ok, data }) => {
      if (!cancelled && ok) {
        setDetail(data);
      }
    });
    void fetchJson<StaffSession>("/api/auth/me").then(({ ok, data }) => {
      if (!cancelled && ok) {
        setMe(data);
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
      headers: { "Content-Type": "application/json" },
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

  async function askThen(ask: { title: string; message: string; confirmLabel: string; tone?: "teal" | "danger" }, action: () => Promise<void>) {
    if (await confirm(ask)) {
      await action();
    }
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
    return <LoadingMark />;
  }

  const step1 = detail.approvals.find((row) => row.step === 1);
  const step2 = detail.approvals.find((row) => row.step === 2);
  const scope = detail.scope;

  const canExport = detail.status === "approved" || detail.status === "closed";

  return (
    <>
      <BackLink href={`/siap/${id}`} />
      <h1 className="mt-3 text-2xl font-semibold">{detail.nama}</h1>
      <PageLead>
        Persetujuan menutup sesi dalam dua catatan. Step 1 hanya Admin. Step 2 hanya Reviewer, dan baru bisa setelah step 1 ada. Export serta tutup sesi menunggu status approved. Reopen mengembalikan sesi ke counting dan hanya bisa dilakukan Admin.
      </PageLead>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <InfoCard icon={CircleDot} title="Status">
          {detail.status}
        </InfoCard>
        <InfoCard icon={UserRound} title="Masuk sebagai">
          {me ? `${me.nama} · ${ROLE_LABEL[me.role]}` : "…"}
        </InfoCard>
        <InfoCard icon={CalendarDays} title="Periode">
          {scope.periode}
        </InfoCard>
        <ScopeLists included={scope.included} excluded={scope.excluded} groups={scope.groups} />
        <InfoCard icon={Clock} title="Cut off" className="sm:col-span-2 xl:col-span-3">
          {formatDateTime(scope.snapshot_at)}
        </InfoCard>
      </div>

      {detail.review.open_tags.length > 0 || detail.review.selisih_hitung > 0 ? (
        <InfoCard icon={TriangleAlert} title="Yang masih menghalangi" className="mt-3 bg-[#f3d4a0]">
          {detail.review.open_tags.length > 0 ? (
            <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
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
            <p className={detail.review.open_tags.length > 0 ? "mt-2" : ""}>
              <Link className="text-ksa-teal-deep" href={`/siap/${id}/laporan/selisih-hitung`}>
                {detail.review.selisih_hitung} selisih hitung
              </Link>{" "}
              masih terbuka.
            </p>
          ) : null}
        </InfoCard>
      ) : null}

      <Card className="mt-3">
        <IconLabel as="h2" icon={Send} title="Kirim ke review" />
        <p className="mt-2 font-semibold leading-6">
          Dilakukan saat status masih counting dan tag serta selisih hitung sudah beres.
        </p>
        <TealButton
          className="mt-4 px-6 py-3"
          disabled={detail.status !== "counting"}
          onClick={() =>
            void askThen(
              {
                title: "Kirim ke review?",
                message: "Status sesi berubah ke review. Hitung baru tidak dilanjutkan sampai sesi di-reopen.",
                confirmLabel: "Kirim ke review",
              },
              () => post(`/api/sessions/${id}/review`, {}),
            )
          }
        >
          Kirim ke review
        </TealButton>
      </Card>

      <Field label="Catatan persetujuan">
        <TextInput value={catatan} onChange={(event) => setCatatan(event.target.value)} />
      </Field>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <IconLabel as="h2" icon={BadgeCheck} title="Step 1 · Admin" />
          <p className="mt-2 font-semibold leading-6">
            {step1 ? `Sudah dicatat oleh ${step1.nama}.` : "Belum ada. Hanya Admin yang bisa mencatat step ini."}
          </p>
          <TealButton
            className="mt-4 px-6 py-3"
            disabled={detail.status !== "review" || Boolean(step1) || me?.role !== "admin"}
            onClick={() =>
              void askThen(
                {
                  title: "Approve step 1?",
                  message: "Catatan ini disimpan sebagai persetujuan Admin dan tidak bisa diulang.",
                  confirmLabel: "Approve step 1",
                },
                () => post(`/api/sessions/${id}/approve`, { step: 1, catatan }),
              )
            }
          >
            Approve step 1
          </TealButton>
        </Card>
        <Card>
          <IconLabel as="h2" icon={BadgeCheck} title="Step 2 · Reviewer" />
          <p className="mt-2 font-semibold leading-6">
            {step2 ? `Sudah dicatat oleh ${step2.nama}.` : "Belum ada. Menunggu step 1, lalu Reviewer mencatat step ini."}
          </p>
          <TealButton
            className="mt-4 px-6 py-3"
            disabled={detail.status !== "review" || !step1 || Boolean(step2) || me?.role !== "reviewer"}
            onClick={() =>
              void askThen(
                {
                  title: "Approve step 2?",
                  message: "Setelah step ini, sesi menjadi approved dan file akhir bisa diunduh.",
                  confirmLabel: "Approve step 2",
                },
                () => post(`/api/sessions/${id}/approve`, { step: 2, catatan }),
              )
            }
          >
            Approve step 2
          </TealButton>
        </Card>
      </div>

      <Card className="mt-3">
        <IconLabel as="h2" icon={FileDown} title="Export dan tutup" />
        <p className="mt-2 font-semibold leading-6">File akhir dan tutup sesi tersedia setelah status approved.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <OutlineButton
            className="px-5 py-2.5"
            disabled={!canExport}
            onClick={() =>
              void askThen(
                { title: "Download Excel?", message: "File Excel sesi ini akan diunduh ke perangkat ini.", confirmLabel: "Download Excel" },
                () => download("xlsx"),
              )
            }
          >
            Download Excel
          </OutlineButton>
          <OutlineButton
            className="px-5 py-2.5"
            disabled={!canExport}
            onClick={() =>
              void askThen(
                { title: "Download PDF?", message: "File PDF sesi ini akan diunduh ke perangkat ini.", confirmLabel: "Download PDF" },
                () => download("pdf"),
              )
            }
          >
            Download PDF
          </OutlineButton>
          <TealButton
            className="px-6 py-3"
            disabled={detail.status !== "approved"}
            onClick={() =>
              void askThen(
                {
                  title: "Tutup sesi?",
                  message: "Sesi yang ditutup tidak bisa dihitung lagi sampai Admin melakukan reopen.",
                  confirmLabel: "Tutup sesi",
                  tone: "danger",
                },
                () => post(`/api/sessions/${id}/close`, {}),
              )
            }
          >
            Tutup sesi
          </TealButton>
        </div>
      </Card>

      <Card className="mt-3 border border-[#e7c56a]">
        <IconLabel as="h2" icon={RotateCcw} title="Reopen" />
        <p className="mt-2 font-semibold leading-6">
          Mengembalikan sesi approved atau closed ke counting. Hanya Admin, dan alasan wajib diisi.
        </p>
        <Field label="Alasan reopen">
          <TextInput value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <TealButton
          className="mt-4 px-6 py-3"
          disabled={!canExport || me?.role !== "admin"}
          onClick={() =>
            void askThen(
              {
                title: "Reopen sesi?",
                message: "Sesi kembali ke counting. Alasan yang diisi ikut tersimpan.",
                confirmLabel: "Reopen",
                tone: "danger",
              },
              () => post(`/api/sessions/${id}/reopen`, { reason }),
            )
          }
        >
          Reopen
        </TealButton>
      </Card>

      <ErrorText>{error}</ErrorText>
    </>
  );
}


"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { ErrorText } from "@/app/siap/ui";

type SessionRow = {
  id: string;
  nama: string;
  periode: string;
  status: string;
};

export default function SiapPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchJson<SessionRow[]>("/api/sessions").then(({ ok, data }) => {
      if (cancelled) {
        return;
      }
      if (!ok) {
        setError("Gagal memuat sesi.");
        return;
      }
      setSessions(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sesi opname</h1>
        <Link href="/siap/baru" className="rounded-full bg-ksa-teal px-5 py-2.5 text-sm font-medium text-white">
          Sesi baru
        </Link>
      </div>
      <ErrorText>{error}</ErrorText>
      <ul className="flex flex-col gap-3">
        {sessions.map((session) => (
          <li key={session.id}>
            <Link
              href={`/siap/${session.id}`}
              className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm"
            >
              <span>
                <span className="block font-medium">{session.nama}</span>
                <span className="text-sm text-[#6b6b6b]">{session.periode}</span>
              </span>
              <span className="text-sm text-ksa-teal-deep">{session.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

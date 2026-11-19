"use client";

import { useEffect, useState } from "react";
import { BackMark, backControlClass } from "@/app/back-icon";
import { BrandLockup } from "@/app/brand-lockup";
import { TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";
import type { StaffSession } from "@/lib/staff-auth";

type Listed = { id: string; nama: string; role: StaffRole };

export function CoordinatorGate({ onReady }: { onReady: (staff: StaffSession) => void }) {
  const [people, setPeople] = useState<Listed[]>([]);
  const [chosen, setChosen] = useState<Listed | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/staff")
      .then((response) => response.json())
      .then((data: { users?: Listed[] }) => {
        if (!cancelled) {
          setPeople(data.users ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal memuat nama.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enter() {
    if (!chosen || !password) {
      toast("Isi password.", setError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: chosen.id, password }),
      });
      const data = (await response.json()) as StaffSession & { error?: string };
      if (!response.ok) {
        toast(data.error ?? "Password salah.", setError);
        return;
      }
      onReady({ id: data.id, nama: data.nama, role: data.role });
    } catch {
      toast("Tidak ada koneksi.", setError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col justify-center px-6 py-10">
      <BrandLockup width={220} height={48} />
      {chosen ? (
        <>
          <button
            type="button"
            className={`${backControlClass} mt-6 text-ksa-teal-deep`}
            onClick={() => {
              setChosen(null);
              setPassword("");
              setError("");
            }}
          >
            <BackMark />
          </button>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">{chosen.nama}</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">{ROLE_LABEL[chosen.role]}</p>
          <label className="mt-6 block text-sm">
            Password
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void enter();
                }
              }}
              className="mt-1 w-full rounded-xl border px-3 py-3"
            />
          </label>
          <TealButton className="mt-4 w-full py-3.5" disabled={busy} onClick={() => void enter()}>
            Masuk
          </TealButton>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-3xl font-semibold leading-tight">Siapa yang masuk?</h1>
          <p className="mt-2 text-sm text-[#6b6b6b]">Pilih nama, lalu isi password.</p>
          <div className="mt-6 flex flex-col gap-3">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
                onClick={() => setChosen(person)}
              >
                <span>
                  <span className="block font-medium">{person.nama}</span>
                  <span className="text-xs text-[#8a8a8a]">{ROLE_LABEL[person.role]}</span>
                </span>
                <span className="text-[#c5c5c5]">›</span>
              </button>
            ))}
          </div>
        </>
      )}
      {error ? <p className="mt-4 rounded-2xl bg-[#f3d4a0] px-4 py-3 text-sm text-[#5a3b00]">{error}</p> : null}
    </main>
  );
}

"use client";

import { KeyRound, UserMinus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { confirm } from "@/app/confirm";
import { EmptyState } from "@/app/empty-state";
import { fetchJson } from "@/app/siap/api";
import { useSiapInvalidate, useSiapQuery } from "@/app/siap/query";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { ErrorText, PageLead, Select, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";
import { ROLE_LABEL, ROLES, type StaffRole } from "@/lib/roles";
import type { StaffSession } from "@/lib/staff-auth";

type Person = { id: string; nama: string; role: StaffRole };

function ActionIcon({
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  label: string;
  tone: "teal" | "danger";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const color = tone === "danger" ? "border-red-300 text-red-800" : "border-ksa-teal text-ksa-teal-deep";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white ${color} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function RoleSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: StaffRole;
  onChange: (role: StaffRole) => void;
  className: string;
  disabled?: boolean;
}) {
  return (
    <Select className={className} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value as StaffRole)}>
      {ROLES.map((item) => (
        <option key={item} value={item}>
          {ROLE_LABEL[item]}
        </option>
      ))}
    </Select>
  );
}

function patchUser(id: string, body: { role?: StaffRole; retired?: boolean; password?: string }) {
  return fetchJson<{ error?: string }>(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function PenggunaBoard() {
  const users = useSiapQuery<{ users: Person[] }>("/api/users");
  const meQuery = useSiapQuery<StaffSession>("/api/auth/me");
  const invalidate = useSiapInvalidate();
  const people = users.data?.users ?? [];
  const me = meQuery.data ?? null;
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<StaffRole>("counter");
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState<{ id: string; role: StaffRole; password: string } | null>(null);
  const [reset, setReset] = useState<{ id: string; password: string } | null>(null);
  const [error, setError] = useState("");

  async function addPerson() {
    setError("");
    if (!nama.trim()) {
      toast("Nama wajib.", setError);
      return;
    }
    if (role !== "counter" && password.trim().length < 8) {
      toast("Password minimal 8 karakter.", setError);
      return;
    }
    const { ok, data } = await fetchJson<{ error?: string }>("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: nama.trim(), role, ...(role === "counter" ? {} : { password: password.trim() }) }),
    });
    if (!ok) {
      toast(data.error ?? "Gagal menambah pengguna.", setError);
      return;
    }
    setNama("");
    setPassword("");
    invalidate(["/api/users"]);
    toast("Pengguna tersimpan.");
  }

  function chooseRole(person: Person, next: StaffRole) {
    if (next === person.role) {
      setDraft(null);
      return;
    }
    if (person.role === "counter" && next !== "counter") {
      setDraft({ id: person.id, role: next, password: "" });
      return;
    }
    setDraft(null);
    void changeRole(person, next);
  }

  async function changeRole(person: Person, next: StaffRole, nextPassword?: string) {
    setError("");
    const { ok, data } = await patchUser(person.id, { role: next, ...(nextPassword ? { password: nextPassword } : {}) });
    if (!ok) {
      toast(data.error ?? "Gagal mengubah role.", setError);
      return;
    }
    invalidate(["/api/users"]);
    setDraft(null);
    toast("Role diubah.");
  }

  async function saveDraft(person: Person) {
    if (!draft || draft.password.trim().length < 8) {
      toast("Password minimal 8 karakter.", setError);
      return;
    }
    const ok = await confirm({
      title: "Simpan role dan password?",
      message: `${person.nama} menjadi ${ROLE_LABEL[draft.role]}. Password baru langsung dipakai untuk masuk.`,
      confirmLabel: "Simpan",
    });
    if (!ok) {
      return;
    }
    await changeRole(person, draft.role, draft.password.trim());
  }

  async function savePassword(person: Person) {
    if (!reset || reset.password.trim().length < 8) {
      toast("Password minimal 8 karakter.", setError);
      return;
    }
    const accepted = await confirm({
      title: "Ganti password?",
      message: `Password ${person.nama} akan diganti. Password lama tidak bisa dipakai lagi.`,
      confirmLabel: "Ganti password",
    });
    if (!accepted) {
      return;
    }
    setError("");
    const { ok, data } = await patchUser(person.id, { password: reset.password.trim() });
    if (!ok) {
      toast(data.error ?? "Gagal mengubah password.", setError);
      return;
    }
    setReset(null);
    toast("Password diubah.");
  }

  async function retire(person: Person) {
    const accepted = await confirm({
      title: "Nonaktifkan pengguna?",
      message: `${person.nama} tidak akan muncul di daftar dan tidak bisa masuk lagi.`,
      confirmLabel: "Nonaktifkan",
      tone: "danger",
    });
    if (!accepted) {
      return;
    }
    setError("");
    const { ok, data } = await patchUser(person.id, { retired: true });
    if (!ok) {
      toast(data.error ?? "Gagal menonaktifkan.", setError);
      return;
    }
    invalidate(["/api/users"]);
    toast(`${person.nama} dinonaktifkan.`);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Pengguna</h1>
      <PageLead>
        Daftar orang yang memakai stock opname. Admin masuk ke Layar koordinator, mencatat approve step 1, dan bisa reopen sesi yang sudah approved atau closed. Reviewer mencatat approve step 2. Petugas tidak punya password dan hanya memilih nama di Layar hitung. Satu orang satu role. Akun yang sedang masuk tidak bisa mengubah role, password, atau menonaktifkan dirinya sendiri.
      </PageLead>
      <div className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          placeholder="Nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        <RoleSelect className="min-w-36" value={role} onChange={setRole} />
        {role === "counter" ? null : (
          <input
            type="password"
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
        <TealButton className="px-5 py-2 text-sm" onClick={() => void addPerson()}>
          Tambah
        </TealButton>
      </div>
      {people.length === 0 ? <EmptyState menu="pengguna" /> : null}
      <ReportTable title="Daftar pengguna" headers={["Nama", "Role", "Action"]}>
        {people.map((person) => {
          const self = person.id === me?.id;
          return (
          <ReportRow key={person.id}>
            <Td className="font-medium">{person.nama}</Td>
            <Td>
              <RoleSelect className="w-full" disabled={self} value={draft?.id === person.id ? draft.role : person.role} onChange={(next) => chooseRole(person, next)} />
              {draft?.id === person.id ? (
                <span className="mt-2 flex gap-2">
                  <input
                    type="password"
                    className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                    placeholder="Password"
                    value={draft.password}
                    onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                  />
                  <TealButton className="px-3 py-1 text-sm" onClick={() => void saveDraft(person)}>
                    Simpan
                  </TealButton>
                </span>
              ) : null}
            </Td>
            <Td>
              <span className="flex flex-wrap gap-2">
                {person.role === "counter" ? null : (
                  <ActionIcon
                    label="Ganti password"
                    tone="teal"
                    disabled={self}
                    onClick={() => setReset(reset?.id === person.id ? null : { id: person.id, password: "" })}
                  >
                    <KeyRound aria-hidden size={16} strokeWidth={2} />
                  </ActionIcon>
                )}
                <ActionIcon label="Nonaktifkan" tone="danger" disabled={self} onClick={() => void retire(person)}>
                  <UserMinus aria-hidden size={16} strokeWidth={2} />
                </ActionIcon>
              </span>
              {reset?.id === person.id ? (
                <span className="mt-2 flex gap-2">
                  <input
                    type="password"
                    className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                    placeholder="Password baru"
                    value={reset.password}
                    onChange={(event) => setReset({ id: person.id, password: event.target.value })}
                  />
                  <TealButton className="px-3 py-1 text-sm" onClick={() => void savePassword(person)}>
                    Simpan
                  </TealButton>
                </span>
              ) : null}
            </Td>
          </ReportRow>
          );
        })}
      </ReportTable>
      <ErrorText>{error}</ErrorText>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { ErrorText, OutlineButton, Select, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";
import { ROLE_LABEL, ROLES, type StaffRole } from "@/lib/roles";

type Person = { id: string; nama: string; role: StaffRole };

function RoleSelect({
  value,
  onChange,
  className,
}: {
  value: StaffRole;
  onChange: (role: StaffRole) => void;
  className: string;
}) {
  return (
    <Select className={className} value={value} onChange={(event) => onChange(event.target.value as StaffRole)}>
      {ROLES.map((item) => (
        <option key={item} value={item}>
          {ROLE_LABEL[item]}
        </option>
      ))}
    </Select>
  );
}

async function readUsers() {
  const { ok, data } = await fetchJson<{ users: Person[] }>("/api/users");
  return ok ? data.users : null;
}

function patchUser(id: string, body: { role?: StaffRole; retired?: boolean }) {
  return fetchJson<{ error?: string }>(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function PenggunaBoard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<StaffRole>("counter");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void readUsers().then((users) => {
      if (!cancelled && users) {
        setPeople(users);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addPerson() {
    setError("");
    if (!nama.trim()) {
      toast("Nama wajib.", setError);
      return;
    }
    const { ok, data } = await fetchJson<{ error?: string }>("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: nama.trim(), role }),
    });
    if (!ok) {
      toast(data.error ?? "Gagal menambah pengguna.", setError);
      return;
    }
    setNama("");
    toast("Pengguna tersimpan.");
    const users = await readUsers();
    if (users) {
      setPeople(users);
    }
  }

  async function changeRole(person: Person, next: StaffRole) {
    setError("");
    const { ok, data } = await patchUser(person.id, { role: next });
    if (!ok) {
      toast(data.error ?? "Gagal mengubah role.", setError);
      return;
    }
    setPeople((current) => current.map((row) => (row.id === person.id ? { ...row, role: next } : row)));
    toast("Role diubah.");
  }

  async function retire(person: Person) {
    setError("");
    const { ok, data } = await patchUser(person.id, { retired: true });
    if (!ok) {
      toast(data.error ?? "Gagal menonaktifkan.", setError);
      return;
    }
    setPeople((current) => current.filter((row) => row.id !== person.id));
    toast(`${person.nama} dinonaktifkan.`);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Pengguna</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#6b6b6b]">
        Admin approve step 1 dan bisa reopen sesi. Reviewer approve step 2. Petugas hitung di HP. Satu orang satu role, dan siapa pun bisa ditugaskan hitung.
      </p>
      <div className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          placeholder="Nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        <RoleSelect className="min-w-36" value={role} onChange={setRole} />
        <TealButton className="px-5 py-2 text-sm" onClick={() => void addPerson()}>
          Tambah
        </TealButton>
      </div>
      <ReportTable headers={["Nama", "Role", ""]}>
        {people.map((person) => (
          <ReportRow key={person.id}>
            <Td className="font-medium">{person.nama}</Td>
            <Td>
              <RoleSelect className="w-full" value={person.role} onChange={(next) => void changeRole(person, next)} />
            </Td>
            <Td>
              <OutlineButton className="px-3 py-1" onClick={() => void retire(person)}>
                Nonaktifkan
              </OutlineButton>
            </Td>
          </ReportRow>
        ))}
      </ReportTable>
      <ErrorText>{error}</ErrorText>
    </>
  );
}

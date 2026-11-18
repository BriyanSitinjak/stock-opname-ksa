"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { ErrorText, OutlineButton, TealButton } from "@/app/siap/ui";
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
    <select className={className} value={value} onChange={(event) => onChange(event.target.value as StaffRole)}>
      {ROLES.map((item) => (
        <option key={item} value={item}>
          {ROLE_LABEL[item]}
        </option>
      ))}
    </select>
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
  const [message, setMessage] = useState("");

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
    setMessage("");
    if (!nama.trim()) {
      setError("Nama wajib.");
      return;
    }
    const { ok, data } = await fetchJson<{ error?: string }>("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: nama.trim(), role }),
    });
    if (!ok) {
      setError(data.error ?? "Gagal menambah pengguna.");
      return;
    }
    setNama("");
    setMessage("Pengguna tersimpan.");
    const users = await readUsers();
    if (users) {
      setPeople(users);
    }
  }

  async function changeRole(person: Person, next: StaffRole) {
    setError("");
    setMessage("");
    const { ok, data } = await patchUser(person.id, { role: next });
    if (!ok) {
      setError(data.error ?? "Gagal mengubah peran.");
      return;
    }
    setPeople((current) => current.map((row) => (row.id === person.id ? { ...row, role: next } : row)));
  }

  async function retire(person: Person) {
    setError("");
    setMessage("");
    const { ok, data } = await patchUser(person.id, { retired: true });
    if (!ok) {
      setError(data.error ?? "Gagal menonaktifkan.");
      return;
    }
    setPeople((current) => current.filter((row) => row.id !== person.id));
    setMessage(`${person.nama} dinonaktifkan.`);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Pengguna</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#6b6b6b]">
        Admin menyetujui langkah 1 dan membuka ulang sesi. Reviewer menyetujui langkah 2. Petugas menghitung barang di HP. Satu orang satu peran, dan siapa pun bisa ditugaskan menghitung.
      </p>
      <div className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          placeholder="Nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        <RoleSelect className="rounded-xl border px-3 py-2 text-sm" value={role} onChange={setRole} />
        <TealButton className="px-5 py-2 text-sm" onClick={() => void addPerson()}>
          Tambah
        </TealButton>
      </div>
      <ReportTable headers={["Nama", "Peran", ""]}>
        {people.map((person) => (
          <ReportRow key={person.id}>
            <Td className="font-medium">{person.nama}</Td>
            <Td>
              <RoleSelect className="rounded-lg border px-2 py-1" value={person.role} onChange={(next) => void changeRole(person, next)} />
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
      {message ? <p className="mt-4 text-sm text-ksa-teal-deep">{message}</p> : null}
    </>
  );
}

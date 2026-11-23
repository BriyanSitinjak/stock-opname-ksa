"use client";

import Link from "next/link";
import { EmptyState } from "@/app/empty-state";
import { QueryView } from "@/app/siap/query";
import { scrollListClass } from "@/app/siap/report-table";
import { SAMPLE_DENAH_NOTE, pantauHref, selesaiCaption } from "@/lib/tag-status";

type GudangRow = { nama: string; selesai: number; total: number; selisih_hitung: number };

export function PantauHome({ id }: { id: string }) {
  return (
    <QueryView<{ gudang: GudangRow[]; pinned: boolean }> path={`/api/sessions/${id}/denah`}>
      {(data) => (
        <>
          {data.gudang.length === 0 ? <EmptyState menu="denah" /> : null}
          {data.gudang.length > 0 && !data.pinned ? <p className="mt-6 text-sm text-[#6b6b6b]">{SAMPLE_DENAH_NOTE}</p> : null}
          <ul className={`mt-6 grid gap-3 sm:grid-cols-2 ${scrollListClass}`}>
            {data.gudang.map((row) => (
              <li key={row.nama}>
                <Link href={pantauHref(id, row.nama)} className="block rounded-2xl bg-white p-5 shadow-sm">
                  <p className="font-medium">{row.nama}</p>
                  <p className="mt-1 text-sm text-[#6b6b6b]">{selesaiCaption(row)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </QueryView>
  );
}

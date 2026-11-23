"use client";

import { QueryView } from "@/app/siap/query";
import { TAG_STATUS_LABEL, TAG_STATUSES, type TagStatus } from "@/lib/tag-status";

export function RekapTagView({ id }: { id: string }) {
  return (
    <QueryView<{ counts: Partial<Record<TagStatus, number>> }> path={`/api/sessions/${id}/rekap-tag`}>
      {(data) => (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TAG_STATUSES.map((status) => (
            <li key={status} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-[#6b6b6b]">{TAG_STATUS_LABEL[status]}</p>
              <p className="mt-2 text-2xl font-semibold">{data.counts[status] ?? 0}</p>
            </li>
          ))}
        </ul>
      )}
    </QueryView>
  );
}

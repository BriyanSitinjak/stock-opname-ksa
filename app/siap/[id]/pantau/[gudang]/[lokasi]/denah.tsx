"use client";

import { useState } from "react";
import { StatusChip, tagBandClass } from "@/app/siap/pantau-ui";
import { statusCaption, TAG_STATUS_LABEL, type DenahTag } from "@/lib/monitor";

export function LokasiDenah({ tags }: { tags: DenahTag[] }) {
  const [openId, setOpenId] = useState<string | null>(tags[0]?.tag_id ?? null);
  const open = tags.find((tag) => tag.tag_id === openId) ?? null;
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-[160px] items-stretch gap-2 rounded-3xl bg-white p-4 shadow-sm">
        {tags.map((tag) => (
          <button
            key={tag.tag_id}
            type="button"
            onClick={() => setOpenId(tag.tag_id)}
            style={{ flexGrow: tag.weight, flexBasis: 0 }}
            className={`flex min-h-28 min-w-0 flex-col items-start justify-between p-3 text-left ${tagBandClass(tag.status)} ${
              openId === tag.tag_id ? "ring-2 ring-offset-2 ring-[#1c1c1c]" : ""
            }`}
            aria-pressed={openId === tag.tag_id}
            aria-label={`${tag.nomor}, ${TAG_STATUS_LABEL[tag.status]}`}
          >
            <StatusChip status={tag.status} extra={tag.nomor} />
            <span className="bg-white/90 px-1 text-[11px] text-[#1c1c1c]">{TAG_STATUS_LABEL[tag.status]}</span>
          </button>
        ))}
      </div>
      <aside className="rounded-3xl bg-white p-5 shadow-sm">
        {open ? (
          <>
            <p className="text-sm text-[#6b6b6b]">{open.lokasi_nama}</p>
            <h2 className="text-xl font-semibold">Tag {open.nomor}</h2>
            <p className="mt-2 text-sm">{statusCaption(open.status)}</p>
            <p className="mt-4 text-sm">Pass 1: {open.pass_1_nama ?? "—"}</p>
            <p className="text-sm">Pass 2: {open.pass_2_nama ?? "—"}</p>
          </>
        ) : (
          <p className="text-sm">Pilih tag pada denah.</p>
        )}
      </aside>
    </div>
  );
}

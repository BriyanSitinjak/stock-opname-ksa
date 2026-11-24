"use client";

import { useMemo, useState } from "react";
import { FloorDrawing } from "@/app/denah/floor-drawing";
import { GudangTabs } from "@/app/denah/gudang-tabs";
import { floorByGudang, floors, type FloorPlace } from "@/lib/floor-plan";
import { latestAssignment, locatePrepareTagByNomor, type LocatedPrepareTag } from "@/lib/prepare-locate";
import type { PreparePayload } from "@/lib/offline/queue";

type PlaceStatus = "mine" | "other" | "crossed" | "empty";

const PLACE_TONE: Record<PlaceStatus, string> = {
  mine: "bg-ksa-teal text-white",
  crossed: "bg-[#e8e4dc] text-[#8a8a8a]",
  other: "bg-ksa-sage/60 text-ksa-teal-deep/70",
  empty: "bg-[#f3eee4] text-[#b0b0b0]",
};

export function PhoneDenah({
  prepare,
  onPick,
}: {
  prepare: PreparePayload;
  onPick: (tag: LocatedPrepareTag, pass: number) => void;
}) {
  const [gudang, setGudang] = useState(floors[0]?.gudang ?? 17);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const floor = floorByGudang(gudang) ?? floors[0]!;
  const crossed = useMemo(() => new Set((prepare.crosses ?? []).map((row) => row.aisle)), [prepare.crosses]);

  function statusFor(place: FloorPlace): PlaceStatus {
    if (crossed.has(place.aisle) || crossed.has(place.label)) {
      return "crossed";
    }
    const tag = locatePrepareTagByNomor(prepare, place.label);
    if (!tag) {
      return "empty";
    }
    return prepare.assignments.some((row) => row.tag_id === tag.id) ? "mine" : "other";
  }

  function onSelect(place: FloorPlace) {
    if (statusFor(place) !== "mine") {
      return;
    }
    const tag = locatePrepareTagByNomor(prepare, place.label);
    const assignment = tag ? latestAssignment(prepare, tag.id) : null;
    if (!tag || !assignment) {
      return;
    }
    setSelectedId(place.id);
    onPick(tag, assignment.pass);
  }

  return (
    <div>
      <GudangTabs
        value={floor.gudang}
        inactiveClass="bg-white text-[#1c1c1c] shadow-sm"
        onChange={(next) => {
          setGudang(next);
          setSelectedId(null);
        }}
      />
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-[#6b6b6b]">
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-ksa-teal" aria-hidden />
          Tugas Anda
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-[#e8e4dc]" aria-hidden />
          Tidak tersedia
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-ksa-sage/60" aria-hidden />
          Bukan tugas Anda
        </li>
      </ul>
      <p className="mt-3 text-sm text-[#5c5c5c]">{floor.note}</p>
      <FloorDrawing
        floor={floor}
        selectedId={selectedId}
        onSelect={onSelect}
        placeClassName={(place) => PLACE_TONE[statusFor(place)]}
        disabledPlace={(place) => statusFor(place) !== "mine"}
      />
    </div>
  );
}

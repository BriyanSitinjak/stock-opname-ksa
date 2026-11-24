"use client";

import { useMemo, useState } from "react";
import { FloorDrawing } from "@/app/denah/floor-drawing";
import { GudangTabs } from "@/app/denah/gudang-tabs";
import type { LocalProgress } from "@/app/hitung/local-progress";
import { floorByGudang, floors, type FloorPlace } from "@/lib/floor-plan";
import { latestAssignment, locatePrepareTagByNomor, type LocatedPrepareTag } from "@/lib/prepare-locate";
import type { PreparePayload } from "@/lib/offline/queue";

type PlaceStatus = "mine" | "done" | "other" | "crossed" | "empty";

const PLACE_TONE: Record<PlaceStatus, string> = {
  mine: "bg-ksa-teal text-white",
  done: "bg-[#1c1c1c] text-white",
  crossed: "bg-[#e8e4dc] text-[#8a8a8a]",
  other: "bg-ksa-sage/60 text-ksa-teal-deep/70",
  empty: "bg-[#f3eee4] text-[#b0b0b0]",
};

const SELECTABLE: PlaceStatus[] = ["mine", "done"];

function resolvePlace(
  prepare: PreparePayload,
  crossed: Set<string>,
  doneTagIds: Set<string>,
  place: FloorPlace,
): { status: PlaceStatus; tag: LocatedPrepareTag | null } {
  if (crossed.has(place.aisle) || crossed.has(place.label)) {
    return { status: "crossed", tag: null };
  }
  const tag = locatePrepareTagByNomor(prepare, place.label);
  if (!tag) {
    return { status: "empty", tag: null };
  }
  if (doneTagIds.has(tag.id)) {
    return { status: "done", tag };
  }
  const mine = prepare.assignments.some((row) => row.tag_id === tag.id);
  return { status: mine ? "mine" : "other", tag };
}

export function PhoneDenah({
  prepare,
  progress,
  onPick,
}: {
  prepare: PreparePayload;
  progress: LocalProgress[];
  onPick: (tag: LocatedPrepareTag, pass: number) => void;
}) {
  const [gudang, setGudang] = useState(floors[0]?.gudang ?? 17);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const floor = floorByGudang(gudang) ?? floors[0]!;
  const crossed = useMemo(() => new Set((prepare.crosses ?? []).map((row) => row.aisle)), [prepare.crosses]);
  const doneTagIds = useMemo(() => new Set(progress.map((row) => row.tag_id)), [progress]);
  const placeInfo = useMemo(() => {
    const map = new Map<string, { status: PlaceStatus; tag: LocatedPrepareTag | null }>();
    for (const place of [...floor.places, ...floor.extras.places]) {
      map.set(place.id, resolvePlace(prepare, crossed, doneTagIds, place));
    }
    return map;
  }, [crossed, doneTagIds, floor.extras.places, floor.places, prepare]);

  function onSelect(place: FloorPlace) {
    const resolved = placeInfo.get(place.id) ?? resolvePlace(prepare, crossed, doneTagIds, place);
    if (!SELECTABLE.includes(resolved.status) || !resolved.tag) {
      return;
    }
    const assignment = latestAssignment(prepare, resolved.tag.id);
    if (!assignment) {
      return;
    }
    setSelectedId(place.id);
    onPick(resolved.tag, assignment.pass);
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
          <span className="h-4 w-4 rounded bg-[#1c1c1c]" aria-hidden />
          Sudah dicatat / sinkron
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
        placeClassName={(place) => PLACE_TONE[placeInfo.get(place.id)?.status ?? "empty"]}
        disabledPlace={(place) => !SELECTABLE.includes(placeInfo.get(place.id)?.status ?? "empty")}
      />
    </div>
  );
}

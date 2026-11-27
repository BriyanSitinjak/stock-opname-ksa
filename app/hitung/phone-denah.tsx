"use client";

import { useMemo, useState } from "react";
import { FloorDrawing, UNAVAILABLE_PLACE_TONE, UnavailablePlaceLabel } from "@/app/denah/floor-drawing";
import { GudangTabs } from "@/app/denah/gudang-tabs";
import { mergedTagPlaceMarks, type LocalProgress, type TagPlaceMark } from "@/app/hitung/local-progress";
import { allFloorPlaces, floorByGudang, floors, type FloorPlace } from "@/lib/floor-plan";
import { latestAssignment, locatePrepareTagByNomor, type LocatedPrepareTag } from "@/lib/prepare-locate";
import type { PreparePayload } from "@/lib/offline/queue";

type PlaceStatus = "mine1" | "mine2" | "done" | "other" | "crossed" | "empty";

type PlaceInfo = {
  status: PlaceStatus;
  tag: LocatedPrepareTag | null;
  pass1: string;
  pass2: string;
  nomor_kartu: string | null;
};

const PLACE_TONE: Record<PlaceStatus, string> = {
  mine1: "bg-ksa-teal text-white",
  mine2: "bg-ksa-amber text-[#5a3b00]",
  done: "bg-[#1c1c1c] text-white",
  crossed: UNAVAILABLE_PLACE_TONE,
  other: "bg-ksa-sage/60 text-ksa-teal-deep/70",
  empty: "bg-[#f3eee4] text-[#b0b0b0]",
};

const SELECTABLE: PlaceStatus[] = ["mine1", "mine2", "done"];
const EMPTY_MARK: TagPlaceMark = { pass1: "", pass2: "", nomor_kartu: null };

const LEGEND: { tone: string; label: string }[] = [
  { tone: "bg-ksa-teal", label: "Tugas H1" },
  { tone: "bg-ksa-amber", label: "Tugas H2" },
  { tone: "bg-[#1c1c1c]", label: "Selesai" },
  { tone: "bg-[#e8e4dc]", label: "Tidak tersedia" },
  { tone: "bg-ksa-sage/60", label: "Bukan tugas" },
];

function resolvePlace(
  prepare: PreparePayload,
  crossed: Set<string>,
  byTag: Map<string, TagPlaceMark>,
  place: FloorPlace,
): PlaceInfo {
  if (place.unavailable || crossed.has(place.aisle) || crossed.has(place.label)) {
    return { status: "crossed", tag: null, ...EMPTY_MARK };
  }
  const tag = locatePrepareTagByNomor(prepare, place.label);
  if (!tag) {
    return { status: "empty", tag: null, ...EMPTY_MARK };
  }
  const mark = byTag.get(tag.id) ?? EMPTY_MARK;
  if (mark.pass1 || mark.pass2) {
    return { status: "done", tag, ...mark };
  }
  const assignment = latestAssignment(prepare, tag.id);
  if (!assignment) {
    return { status: "other", tag, ...EMPTY_MARK };
  }
  return {
    status: assignment.pass === 2 ? "mine2" : "mine1",
    tag,
    ...EMPTY_MARK,
  };
}

function PlaceMark({ pass1, pass2, nomor_kartu }: TagPlaceMark) {
  return (
    <span className="flex w-full flex-col items-center justify-center gap-0.5 leading-none">
      <span className="text-[10px] font-semibold tracking-wide">{pass1 || "·"}</span>
      <span className="h-px w-3/4 bg-white/45" aria-hidden />
      <span className="text-[10px] font-semibold tracking-wide">{pass2 || "·"}</span>
      {nomor_kartu ? (
        <span className="mt-0.5 max-w-full truncate px-0.5 text-[8px] font-medium tracking-tight text-white/80">
          {nomor_kartu}
        </span>
      ) : null}
    </span>
  );
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
  const [gudang, setGudang] = useState(
    () => floors.find((floor) => !floor.freeText)?.gudang ?? floors[0]?.gudang ?? 17,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const floor = floorByGudang(gudang) ?? floors[0]!;
  const crossed = useMemo(() => new Set((prepare.crosses ?? []).map((row) => row.aisle)), [prepare.crosses]);
  const byTag = useMemo(
    () => mergedTagPlaceMarks(progress, prepare.tag_progress, prepare.counter),
    [prepare.counter, prepare.tag_progress, progress],
  );
  const placeInfo = useMemo(() => {
    const map = new Map<string, PlaceInfo>();
    for (const place of allFloorPlaces(floor)) {
      map.set(place.id, resolvePlace(prepare, crossed, byTag, place));
    }
    return map;
  }, [byTag, crossed, floor, prepare]);

  function onSelect(place: FloorPlace) {
    const resolved = placeInfo.get(place.id) ?? resolvePlace(prepare, crossed, byTag, place);
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
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-[#5c5c5c]">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 rounded ${item.tone}`} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
      <FloorDrawing
        floor={floor}
        selectedId={selectedId}
        onSelect={onSelect}
        placeClassName={(place) => PLACE_TONE[placeInfo.get(place.id)?.status ?? "empty"]}
        disabledPlace={(place) => !SELECTABLE.includes(placeInfo.get(place.id)?.status ?? "empty")}
        placeContent={(place, fallback) => {
          const info = placeInfo.get(place.id);
          if (info?.status === "done") {
            return (
              <PlaceMark pass1={info.pass1} pass2={info.pass2} nomor_kartu={info.nomor_kartu} />
            );
          }
          if (info?.status === "crossed") {
            return <UnavailablePlaceLabel />;
          }
          if (info?.status === "mine1" || info?.status === "mine2") {
            return (
              <span className="text-[10px] font-semibold">{info.status === "mine1" ? "H1" : "H2"}</span>
            );
          }
          return fallback;
        }}
      />
    </div>
  );
}

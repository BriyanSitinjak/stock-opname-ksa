"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FloorDrawing } from "@/app/denah/floor-drawing";
import { GudangTabs } from "@/app/denah/gudang-tabs";
import { mergedPassInitials, type LocalProgress, type PassInitials } from "@/app/hitung/local-progress";
import { floorByGudang, floors, type FloorPlace } from "@/lib/floor-plan";
import { latestAssignment, locatePrepareTagByNomor, type LocatedPrepareTag } from "@/lib/prepare-locate";
import type { PreparePayload } from "@/lib/offline/queue";

type PlaceStatus = "mine" | "done" | "other" | "crossed" | "empty";

type PlaceInfo = {
  status: PlaceStatus;
  tag: LocatedPrepareTag | null;
  pass1: string;
  pass2: string;
};

const PLACE_TONE: Record<PlaceStatus, string> = {
  mine: "bg-ksa-teal text-white",
  done: "bg-[#1c1c1c] text-white",
  crossed: "bg-[#e8e4dc] text-[#8a8a8a]",
  other: "bg-ksa-sage/60 text-ksa-teal-deep/70",
  empty: "bg-[#f3eee4] text-[#b0b0b0]",
};

const SELECTABLE: PlaceStatus[] = ["mine", "done"];
const EMPTY_PASSES: PassInitials = { pass1: "", pass2: "" };

function resolvePlace(
  prepare: PreparePayload,
  crossed: Set<string>,
  byTag: Map<string, PassInitials>,
  place: FloorPlace,
): PlaceInfo {
  if (crossed.has(place.aisle) || crossed.has(place.label)) {
    return { status: "crossed", tag: null, ...EMPTY_PASSES };
  }
  const tag = locatePrepareTagByNomor(prepare, place.label);
  if (!tag) {
    return { status: "empty", tag: null, ...EMPTY_PASSES };
  }
  const passes = byTag.get(tag.id) ?? EMPTY_PASSES;
  if (passes.pass1 || passes.pass2) {
    return { status: "done", tag, ...passes };
  }
  const mine = prepare.assignments.some((row) => row.tag_id === tag.id);
  return { status: mine ? "mine" : "other", tag, ...EMPTY_PASSES };
}

function PassInitialsStack({ pass1, pass2 }: PassInitials) {
  return (
    <span className="flex w-full flex-col items-center justify-center gap-0.5 leading-none">
      <span className="text-[10px] font-semibold tracking-wide">{pass1 || "·"}</span>
      <span className="h-px w-3/4 bg-white/45" aria-hidden />
      <span className="text-[10px] font-semibold tracking-wide">{pass2 || "·"}</span>
    </span>
  );
}

function LegendSwatch({ className, children }: { className: string; children?: ReactNode }) {
  return (
    <span className={`flex items-center justify-center rounded ${className}`} aria-hidden>
      {children}
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
  const [gudang, setGudang] = useState(floors[0]?.gudang ?? 17);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const floor = floorByGudang(gudang) ?? floors[0]!;
  const crossed = useMemo(() => new Set((prepare.crosses ?? []).map((row) => row.aisle)), [prepare.crosses]);
  const byTag = useMemo(
    () => mergedPassInitials(progress, prepare.tag_progress, prepare.counter),
    [prepare.counter, prepare.tag_progress, progress],
  );
  const placeInfo = useMemo(() => {
    const map = new Map<string, PlaceInfo>();
    for (const place of [...floor.places, ...floor.extras.places]) {
      map.set(place.id, resolvePlace(prepare, crossed, byTag, place));
    }
    return map;
  }, [byTag, crossed, floor.extras.places, floor.places, prepare]);

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
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-[#6b6b6b]">
        <li className="flex items-center gap-2">
          <LegendSwatch className="h-4 w-4 bg-ksa-teal" />
          Tugas Anda
        </li>
        <li className="flex items-center gap-2">
          <LegendSwatch className="h-5 w-5 bg-[#1c1c1c] text-white">
            <PassInitialsStack pass1="A" pass2="B" />
          </LegendSwatch>
          Selesai · inisial H1 / H2
        </li>
        <li className="flex items-center gap-2">
          <LegendSwatch className="h-4 w-4 bg-[#e8e4dc]" />
          Tidak tersedia
        </li>
        <li className="flex items-center gap-2">
          <LegendSwatch className="h-4 w-4 bg-ksa-sage/60" />
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
        placeContent={(place, fallback) => {
          const info = placeInfo.get(place.id);
          if (info?.status === "done") {
            return <PassInitialsStack pass1={info.pass1} pass2={info.pass2} />;
          }
          return fallback;
        }}
      />
    </div>
  );
}

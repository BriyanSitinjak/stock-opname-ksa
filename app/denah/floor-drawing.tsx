"use client";

import type { ReactNode } from "react";
import { placeAt, type Floor, type FloorExtrasBand, type FloorPlace } from "@/lib/floor-plan";

export const UNAVAILABLE_PLACE_TONE = "bg-[#e8e4dc] text-[#8a8a8a]";

const DEFAULT_PLACE =
  "bg-ksa-sage text-ksa-teal-deep disabled:bg-[#e8e4dc] disabled:text-[#8a8a8a]";

const PLACE_LAYOUT = "flex flex-col items-center justify-center";

/** Shared label for unavailable / crossed denah cells. */
export function UnavailablePlaceLabel() {
  return <span className="text-[9px] font-medium leading-tight">N/A</span>;
}

type PlaceHooks = {
  selectedId: string | null;
  onSelect: (place: FloorPlace) => void;
  placeClassName?: (place: FloorPlace) => string;
  disabledPlace?: (place: FloorPlace) => boolean;
  placeContent?: (place: FloorPlace, fallback: string) => ReactNode;
};

function PlaceButton({
  place,
  selectedId,
  onSelect,
  placeClassName,
  disabledPlace,
  placeContent,
  className,
  fallback,
}: PlaceHooks & { place: FloorPlace; className: string; fallback: string }) {
  const unavailable = Boolean(place.unavailable);
  const disabled = unavailable || (disabledPlace?.(place) ?? false);
  const tone = placeClassName?.(place) ?? (unavailable ? UNAVAILABLE_PLACE_TONE : DEFAULT_PLACE);
  const selected = selectedId === place.id ? "ring-2 ring-[#1c1c1c]" : "";
  const body = unavailable ? (
    <UnavailablePlaceLabel />
  ) : (
    (placeContent?.(place, fallback) ?? fallback)
  );
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(place)}
      className={`${className} disabled:cursor-not-allowed ${tone} ${selected}`}
    >
      {body}
    </button>
  );
}

export function FloorDrawing({
  floor,
  selectedId,
  onSelect,
  placeClassName,
  disabledPlace,
  placeContent,
}: {
  floor: Floor;
} & PlaceHooks) {
  const hooks = { selectedId, onSelect, placeClassName, disabledPlace, placeContent };
  if (floor.freeText) {
    return (
      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-[#1c1c1c]">Tanpa denah palet</p>
        <p className="mt-1 text-sm text-[#5c5c5c]">
          Gudang Barang Rusak dihitung lewat lokasi bebas. Pilih slot tugas dari beranda, bukan dari denah.
        </p>
      </div>
    );
  }
  const far = floor.extras.filter((band) => band.placement === "far" && band.places.length > 0);
  const door = floor.extras.filter((band) => band.placement === "door" && band.places.length > 0);
  return (
    <div className="mt-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-center text-xs tracking-wide text-[#8a8a8a] uppercase">Ujung jauh</p>
      {far.map((band) => (
        <ExtraBand key={`far:${band.title}`} band={band} {...hooks} />
      ))}
      {floor.aisles.length > 0 && floor.rows.length > 0 ? (
        <div
          className="grid min-w-max gap-2"
          style={{ gridTemplateColumns: `2.5rem repeat(${floor.aisles.length}, minmax(3.5rem, 4.5rem))` }}
        >
          <span />
          {floor.aisles.map((aisle) => (
            <span key={aisle.id} className="text-center text-sm font-semibold">
              {aisle.label}
            </span>
          ))}
          {floor.rows.map((row) => (
            <Row key={row} floor={floor} row={row} {...hooks} />
          ))}
        </div>
      ) : null}
      {door.map((band) => (
        <ExtraBand key={`door:${band.title}`} band={band} className="mt-3" {...hooks} />
      ))}
      <p className="mt-3 text-center text-xs tracking-wide text-[#8a8a8a] uppercase">Pintu</p>
    </div>
  );
}

function Row({ floor, row, ...hooks }: { floor: Floor; row: number } & PlaceHooks) {
  return (
    <>
      <span className="self-center text-right text-xs text-[#8a8a8a]">{row}</span>
      {floor.aisles.map((aisle) => {
        const places = placeAt(floor, aisle.id, row);
        if (places.length === 0) {
          return <span key={aisle.id} className="min-h-14 rounded-lg bg-[#f3eee4]" />;
        }
        return (
          <span key={aisle.id} className="flex min-h-14 gap-1">
            {places.map((place) => (
              <PlaceButton
                key={place.id}
                place={place}
                fallback={place.side ?? place.label}
                className={`${PLACE_LAYOUT} flex-1 rounded-lg px-0.5 py-1 text-xs font-medium`}
                {...hooks}
              />
            ))}
          </span>
        );
      })}
    </>
  );
}

function ExtraBand({
  band,
  className = "mb-3",
  ...hooks
}: { band: FloorExtrasBand; className?: string } & PlaceHooks) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs text-[#6b6b6b]">{band.title}</p>
      <div className="flex flex-wrap gap-2">
        {band.places.map((place) => (
          <PlaceButton
            key={place.id}
            place={place}
            fallback={place.label}
            className={`${PLACE_LAYOUT} min-h-14 rounded-xl px-4 py-2 text-sm font-semibold`}
            {...hooks}
          />
        ))}
      </div>
    </div>
  );
}

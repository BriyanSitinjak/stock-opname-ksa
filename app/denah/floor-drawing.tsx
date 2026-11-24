"use client";

import type { ReactNode } from "react";
import { placeAt, type Floor, type FloorPlace } from "@/lib/floor-plan";

const DEFAULT_PLACE =
  "bg-ksa-sage text-ksa-teal-deep disabled:bg-[#e8e4dc] disabled:text-[#8a8a8a]";

type PlaceHooks = {
  selectedId: string | null;
  onSelect: (place: FloorPlace) => void;
  placeClassName?: (place: FloorPlace) => string;
  disabledPlace?: (place: FloorPlace) => boolean;
};

function PlaceButton({
  place,
  selectedId,
  onSelect,
  placeClassName,
  disabledPlace,
  className,
  children,
}: PlaceHooks & { place: FloorPlace; className: string; children: ReactNode }) {
  const disabled = disabledPlace?.(place) ?? false;
  const tone = placeClassName?.(place) ?? DEFAULT_PLACE;
  const selected = selectedId === place.id ? "ring-2 ring-[#1c1c1c]" : "";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(place)}
      className={`${className} disabled:cursor-not-allowed ${tone} ${selected}`}
    >
      {children}
    </button>
  );
}

export function FloorDrawing({
  floor,
  selectedId,
  onSelect,
  placeClassName,
  disabledPlace,
}: {
  floor: Floor;
} & PlaceHooks) {
  const hooks = { selectedId, onSelect, placeClassName, disabledPlace };
  return (
    <div className="mt-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-center text-xs tracking-wide text-[#8a8a8a] uppercase">Ujung jauh</p>
      {floor.extras.placement === "far" ? <ExtraBand floor={floor} {...hooks} /> : null}
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
      {floor.extras.placement === "door" && floor.extras.places.length > 0 ? (
        <ExtraBand floor={floor} {...hooks} />
      ) : null}
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
          return <span key={aisle.id} className="min-h-10 rounded-lg bg-[#f3eee4]" />;
        }
        return (
          <span key={aisle.id} className="flex min-h-10 gap-1">
            {places.map((place) => (
              <PlaceButton key={place.id} place={place} className="flex-1 rounded-lg text-xs font-medium" {...hooks}>
                {place.side}
              </PlaceButton>
            ))}
          </span>
        );
      })}
    </>
  );
}

function ExtraBand({ floor, ...hooks }: { floor: Floor } & PlaceHooks) {
  return (
    <div className={floor.extras.placement === "door" ? "mt-3" : "mb-3"}>
      <p className="mb-2 text-xs text-[#6b6b6b]">{floor.extras.title}</p>
      <div className="flex flex-wrap gap-2">
        {floor.extras.places.map((place) => (
          <PlaceButton key={place.id} place={place} className="rounded-xl px-4 py-3 text-sm font-semibold" {...hooks}>
            {place.label}
          </PlaceButton>
        ))}
      </div>
    </div>
  );
}

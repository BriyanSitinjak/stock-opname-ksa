"use client";

import { useState } from "react";
import { floorByGudang, floors, placeAt, type Floor, type FloorPlace } from "@/lib/floor-plan";

export function FloorBoard() {
  const [gudang, setGudang] = useState(17);
  const [selected, setSelected] = useState<FloorPlace | null>(null);
  const floor = floorByGudang(gudang) ?? floors[0]!;

  function choose(next: number) {
    setGudang(next);
    setSelected(null);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {floors.map((item) => (
          <button
            key={item.gudang}
            type="button"
            onClick={() => choose(item.gudang)}
            className={`rounded-full px-4 py-2 text-sm ${
              item.gudang === floor.gudang ? "bg-ksa-teal text-white" : "bg-white text-[#1c1c1c]"
            }`}
          >
            {item.gudang}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-[#5c5c5c]">{floor.note}</p>
      <p className="mt-1 text-sm text-[#6b6b6b]">{floor.places.length + floor.extras.places.length} posisi</p>
      <FloorDrawing floor={floor} selectedId={selected?.id ?? null} onSelect={setSelected} />
      <aside className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <p className="text-sm text-[#6b6b6b]">{floor.nama}</p>
            <h2 className="text-2xl font-semibold">{selected.label}</h2>
            <p className="mt-2 text-sm text-[#5c5c5c]">
              Ini posisi di lantai. Nomor pada kartu diketik petugas saat menghitung.
            </p>
          </>
        ) : (
          <p className="text-sm">Pilih satu posisi pada gambar.</p>
        )}
      </aside>
    </div>
  );
}

function placeRing(selected: boolean) {
  return selected ? "ring-2 ring-[#1c1c1c]" : "";
}

function FloorDrawing({
  floor,
  selectedId,
  onSelect,
}: {
  floor: Floor;
  selectedId: string | null;
  onSelect: (place: FloorPlace) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-center text-xs tracking-wide text-[#8a8a8a] uppercase">Ujung jauh</p>
      {floor.extras.placement === "far" ? <ExtraBand floor={floor} selectedId={selectedId} onSelect={onSelect} /> : null}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `3rem repeat(${floor.aisles.length}, minmax(4.5rem, 1fr))` }}
      >
        <span />
        {floor.aisles.map((aisle) => (
          <span key={aisle.id} className="text-center text-sm font-semibold">
            {aisle.label}
          </span>
        ))}
        {floor.rows.map((row) => (
          <Row key={row} floor={floor} row={row} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </div>
      {floor.extras.placement === "door" && floor.extras.places.length > 0 ? (
        <ExtraBand floor={floor} selectedId={selectedId} onSelect={onSelect} />
      ) : null}
      <p className="mt-3 text-center text-xs tracking-wide text-[#8a8a8a] uppercase">Pintu</p>
    </div>
  );
}

function Row({
  floor,
  row,
  selectedId,
  onSelect,
}: {
  floor: Floor;
  row: number;
  selectedId: string | null;
  onSelect: (place: FloorPlace) => void;
}) {
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
              <button
                key={place.id}
                type="button"
                onClick={() => onSelect(place)}
                className={`flex-1 rounded-lg bg-ksa-sage text-xs font-medium text-ksa-teal-deep ${placeRing(selectedId === place.id)}`}
              >
                {place.side}
              </button>
            ))}
          </span>
        );
      })}
    </>
  );
}

function ExtraBand({
  floor,
  selectedId,
  onSelect,
}: {
  floor: Floor;
  selectedId: string | null;
  onSelect: (place: FloorPlace) => void;
}) {
  return (
    <div className={floor.extras.placement === "door" ? "mt-3" : "mb-3"}>
      <p className="mb-2 text-xs text-[#6b6b6b]">{floor.extras.title}</p>
      <div className="flex flex-wrap gap-2">
        {floor.extras.places.map((place) => (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelect(place)}
            className={`rounded-xl bg-ksa-sage px-4 py-3 text-sm font-semibold text-ksa-teal-deep ${placeRing(selectedId === place.id)}`}
          >
            {place.label}
          </button>
        ))}
      </div>
    </div>
  );
}

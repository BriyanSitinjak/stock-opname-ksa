"use client";

import { useState } from "react";
import { FloorDrawing } from "@/app/denah/floor-drawing";
import { GudangTabs } from "@/app/denah/gudang-tabs";
import { activePlaceCount, floorByGudang, floors, type FloorPlace } from "@/lib/floor-plan";

export function FloorBoard() {
  const [gudang, setGudang] = useState(floors[0]?.gudang ?? 17);
  const [selected, setSelected] = useState<FloorPlace | null>(null);
  const floor = floorByGudang(gudang) ?? floors[0]!;

  return (
    <div className="mt-6">
      <GudangTabs
        value={floor.gudang}
        onChange={(next) => {
          setGudang(next);
          setSelected(null);
        }}
      />
      <p className="mt-4 text-sm text-[#5c5c5c]">{floor.note}</p>
      <p className="mt-1 text-sm text-[#6b6b6b]">{activePlaceCount(floor)} posisi aktif</p>
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

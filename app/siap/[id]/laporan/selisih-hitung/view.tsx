"use client";

import { QueryView } from "@/app/siap/query";
import { SelisihHitungBoard, type SelisihHitungRow } from "./board";

type Catalog = { counters: { id: string; nama: string; role: string }[] };

export function SelisihHitungView({ id }: { id: string }) {
  return (
    <QueryView<SelisihHitungRow[]> path={`/api/sessions/${id}/selisih-hitung`}>
      {(rows) => (
        <QueryView<Catalog> path="/api/setup/catalog">
          {(catalog) => (
            <SelisihHitungBoard
              id={id}
              rows={rows}
              counters={catalog.counters.filter((person) => person.role === "counter")}
            />
          )}
        </QueryView>
      )}
    </QueryView>
  );
}

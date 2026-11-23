"use client";

import { petugasOnly, type CounterCatalog } from "@/app/siap/pass-select";
import { QueryView } from "@/app/siap/query";
import { SelisihHitungBoard, type SelisihHitungRow } from "./board";

export function SelisihHitungView({ id }: { id: string }) {
  return (
    <QueryView<SelisihHitungRow[]> path={`/api/sessions/${id}/selisih-hitung`}>
      {(rows) => (
        <QueryView<CounterCatalog> path="/api/setup/catalog">
          {(catalog) => (
            <SelisihHitungBoard
              id={id}
              rows={rows}
              counters={petugasOnly(catalog.counters)}
            />
          )}
        </QueryView>
      )}
    </QueryView>
  );
}

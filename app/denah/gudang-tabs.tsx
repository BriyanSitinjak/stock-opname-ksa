"use client";

import { floors } from "@/lib/floor-plan";

export function GudangTabs({
  value,
  onChange,
  inactiveClass = "bg-white text-[#1c1c1c]",
}: {
  value: number;
  onChange: (gudang: number) => void;
  inactiveClass?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {floors.map((item) => (
        <button
          key={item.gudang}
          type="button"
          onClick={() => onChange(item.gudang)}
          className={`rounded-full px-4 py-2 text-sm ${
            item.gudang === value ? "bg-ksa-teal text-white" : inactiveClass
          }`}
        >
          {item.gudang}
        </button>
      ))}
    </div>
  );
}

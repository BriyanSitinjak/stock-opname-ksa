import { BrandIcon } from "@/app/brand-lockup";

export function emptyMessage(menu: string, kind: "belum" | "tidak" = "belum") {
  return kind === "belum" ? `Belum ada ${menu}` : `Tidak ada ${menu}`;
}

export function EmptyState({ menu, kind = "belum" }: { menu: string; kind?: "belum" | "tidak" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16" role="status">
      <BrandIcon size={72} className="rounded-2xl" />
      <p className="text-sm text-[#6b6b6b]">{emptyMessage(menu, kind)}</p>
    </div>
  );
}

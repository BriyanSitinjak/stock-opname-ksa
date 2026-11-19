import { BrandIcon } from "@/app/brand-lockup";

export function LoadingMark() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4" role="status" aria-label="Memuat">
      <span className="relative grid size-28 place-items-center">
        <svg className="absolute inset-0 size-full animate-spin motion-reduce:animate-none" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--ksa-sage)" strokeWidth="5" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--ksa-teal)" strokeWidth="5" strokeLinecap="round" strokeDasharray="70 210" />
        </svg>
        <BrandIcon size={64} priority className="rounded-2xl" />
      </span>
    </div>
  );
}

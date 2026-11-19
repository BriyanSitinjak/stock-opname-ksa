import { ArrowLeft } from "lucide-react";

export const backControlClass = "inline-flex items-center gap-1.5 text-sm font-medium";

export function BackMark() {
  return (
    <>
      <ArrowLeft aria-hidden size={22} strokeWidth={2} />
      <span>Kembali</span>
    </>
  );
}

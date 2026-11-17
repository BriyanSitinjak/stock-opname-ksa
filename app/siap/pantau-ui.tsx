import { TAG_STATUS_LABEL, TAG_STATUS_MARK, TAG_STATUSES, type TagStatus } from "@/lib/monitor";

export function tagBandClass(status: TagStatus) {
  switch (status) {
    case "belum":
      return "border-2 border-solid border-[#1c1c1c] bg-white text-[#1c1c1c]";
    case "menunggu_hitung_2":
      return "border-2 border-dashed border-ksa-teal-deep bg-ksa-sage text-ksa-teal-deep";
    case "selisih_hitung":
      return "border-2 border-[#1c1c1c] text-[#1c1c1c] [background-image:repeating-linear-gradient(45deg,#e7c56a_0_8px,#2b2b2b_8px_12px)]";
    case "selesai":
      return "border-2 border-ksa-teal bg-ksa-teal text-white";
    case "kosong":
      return "border-2 border-dotted border-[#1c1c1c] bg-[#f3eee4] text-[#1c1c1c]";
  }
}

export function StatusLegend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-3 text-xs">
      {TAG_STATUSES.map((status) => (
        <li key={status} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center text-[11px] font-semibold ${tagBandClass(status)}`}
            aria-hidden
          >
            {TAG_STATUS_MARK[status]}
          </span>
          {TAG_STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  );
}

export function StatusChip({ status, extra }: { status: TagStatus; extra?: string }) {
  return (
    <span className="bg-white/90 px-1 text-xs font-semibold text-[#1c1c1c]">
      {TAG_STATUS_MARK[status]}
      {extra ? ` ${extra}` : ""}
    </span>
  );
}

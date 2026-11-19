import type { ReactNode } from "react";

export const scrollListClass = "max-h-[32rem] overflow-y-auto";

export function ReportTable({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <div className={`overflow-auto rounded-2xl border border-[#e7dfd2] bg-white ${scrollListClass}`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-[#e7dfd2]">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-bold text-[#1c1c1c]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-normal">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export function ReportRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`border-b last:border-0 ${className}`}>{children}</tr>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}

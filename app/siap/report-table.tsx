import type { ReactNode } from "react";

export function ReportTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b text-[#6b6b6b]">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ReportRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`border-b last:border-0 ${className}`}>{children}</tr>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}

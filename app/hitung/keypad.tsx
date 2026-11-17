"use client";

type Props = {
  onDigit: (digit: string) => void;
  onBack: () => void;
  extra?: { label: string; onClick: () => void };
  variant?: "light" | "dark";
};

export function NumericKeypad({ onDigit, onBack, extra, variant = "light" }: Props) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", extra ? "extra" : ".", "0", "back"];
  const cell =
    variant === "dark"
      ? "min-h-14 rounded-2xl bg-ksa-panel text-xl text-white"
      : "min-h-14 rounded-2xl bg-white text-xl text-[#1c1c1c] shadow-sm";
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => {
        if (key === "extra" && extra) {
          return (
            <button key="extra" type="button" className={cell} onClick={extra.onClick}>
              {extra.label}
            </button>
          );
        }
        if (key === "back") {
          return (
            <button key="back" type="button" className={`${cell} text-base`} onClick={onBack}>
              Hapus
            </button>
          );
        }
        return (
          <button key={key} type="button" className={cell} onClick={() => onDigit(key)}>
            {key}
          </button>
        );
      })}
    </div>
  );
}

"use client";

type Props = {
  onDigit: (digit: string) => void;
  onBack: () => void;
  variant?: "light" | "dark";
};

function appendAisleDigit(value: string, digit: string) {
  if (digit === ".") {
    return value.includes(".") ? value : `${value}.`;
  }
  return value + digit;
}

export function NumericKeypad({ onDigit, onBack, variant = "light" }: Props) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  const cell =
    variant === "dark"
      ? "min-h-14 rounded-2xl bg-ksa-panel text-xl text-white"
      : "min-h-14 rounded-2xl bg-white text-xl text-[#1c1c1c] shadow-sm";
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => {
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

export function AisleNumberPad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <>
      <p className="mt-2 min-h-16 text-5xl font-semibold tracking-widest">{value || " "}</p>
      <div className="mt-6">
        <NumericKeypad
          onDigit={(digit) => onChange(appendAisleDigit(value, digit))}
          onBack={() => onChange(value.slice(0, -1))}
        />
      </div>
    </>
  );
}

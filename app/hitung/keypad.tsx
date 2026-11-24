"use client";

type Props = {
  onDigit: (digit: string) => void;
  onBack: () => void;
};

export function NumericKeypad({ onDigit, onBack }: Props) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  const cell = "min-h-14 rounded-2xl bg-ksa-panel text-xl text-white";
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div className="grid min-w-0 grid-cols-3 gap-2">
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
    </div>
  );
}

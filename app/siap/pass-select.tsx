"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { fieldControlClass } from "@/app/siap/ui";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";

export type CounterOption = { id: string; nama: string; role?: StaffRole };

export type CounterCatalog = { counters: CounterOption[] };

export function petugasOnly<T extends { role?: string }>(people: T[]) {
  return people.filter((person) => person.role === "counter");
}

const BLANK = "Pilih petugas";

function personLabel(person: CounterOption) {
  return person.role ? `${person.nama} · ${ROLE_LABEL[person.role]}` : person.nama;
}

function MenuChoice({ label, selected, muted, onPick }: { label: string; selected?: boolean; muted?: boolean; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected ?? false}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-[#f6f1e8] ${selected ? "bg-[#d7e8e2]" : ""} ${muted ? "text-[#6b6b6b]" : ""}`}
        onClick={onPick}
      >
        {label}
      </button>
    </li>
  );
}

type MenuBox = { top: number; left: number; width: number; maxHeight: number };

function menuBox(rect: DOMRect): MenuBox {
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  const spaceAbove = rect.top - 8;
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : spaceBelow));
  return {
    top: openUp ? Math.max(8, rect.top - 4 - maxHeight) : rect.bottom + 4,
    left: rect.left,
    width: Math.max(rect.width, 180),
    maxHeight,
  };
}

export function PassSelect({
  counters,
  value,
  disabled,
  className = "w-full",
  onChange,
}: {
  counters: CounterOption[];
  value: string | null;
  disabled?: boolean;
  className?: string;
  onChange: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<MenuBox | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selected = counters.find((person) => person.id === value);

  function pick(userId: string) {
    onChange(userId);
    setOpen(false);
  }

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setBox(menuBox(rect));
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 py-2 pr-3 pl-3 text-left ${fieldControlClass} ${className}`}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          place();
          setOpen(true);
        }}
      >
        <span className="min-w-0 truncate">{selected ? personLabel(selected) : BLANK}</span>
        <ChevronDown aria-hidden className="shrink-0 text-ksa-teal-deep" size={16} strokeWidth={2} />
      </button>
      {open && box
        ? createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
              className="fixed z-50 overflow-auto rounded-xl border border-[#e7dfd2] bg-white py-1 shadow-lg"
            >
              {counters.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[#6b6b6b]">Belum ada petugas.</li>
              ) : (
                <>
                  <MenuChoice muted label={BLANK} onPick={() => pick("")} />
                  {counters.map((person) => (
                    <MenuChoice
                      key={person.id}
                      label={personLabel(person)}
                      selected={person.id === value}
                      onPick={() => pick(person.id)}
                    />
                  ))}
                </>
              )}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}

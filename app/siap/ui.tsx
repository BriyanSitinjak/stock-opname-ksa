"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { BackIcon, backControlClass } from "@/app/back-icon";

export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="Kembali" className={`${backControlClass} text-ksa-teal-deep`}>
      <BackIcon />
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

export function MissingList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-4 rounded-2xl bg-[#f3d4a0] p-4 text-sm">
      {items.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }
  return <p className="mt-4 text-sm text-red-800">{children}</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block text-sm first:mt-0">
      {label}
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mt-1 w-full rounded-xl border px-3 py-2 ${props.className ?? ""}`} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex min-w-0 align-middle ${className}`}>
      <select
        {...props}
        className="w-full cursor-pointer appearance-none rounded-xl border border-[#e7dfd2] bg-white py-2 pr-9 pl-3 text-sm text-[#1c1c1c] shadow-sm outline-none transition-[border-color,box-shadow] duration-150 hover:border-ksa-teal/50 focus:border-ksa-teal focus:ring-2 focus:ring-ksa-teal/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ksa-teal-deep" size={16} strokeWidth={2} />
    </span>
  );
}

export function SearchForm({
  action,
  name,
  defaultValue,
  placeholder,
}: {
  action: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <form className="mt-4 flex max-w-xl gap-2" action={action}>
      <input name={name} defaultValue={defaultValue} className="flex-1 rounded-xl border px-3 py-2 text-sm" placeholder={placeholder} />
      <TealButton type="submit" className="px-5 py-2.5 text-sm">
        Search
      </TealButton>
    </form>
  );
}

export function TealButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full bg-ksa-teal font-medium text-white disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border border-ksa-teal text-sm disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function ScopeTicks({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

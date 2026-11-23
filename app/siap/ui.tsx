"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Ban, ChevronDown, Layers, Tags, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { BackMark, backControlClass } from "@/app/back-icon";
import { countedTitle } from "@/app/siap/format";

export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className={`${backControlClass} text-ksa-teal-deep`}>
      <BackMark />
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

export function PageLead({ children }: { children: ReactNode }) {
  return <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b6b6b]">{children}</p>;
}

export function IconLabel({
  icon: Icon,
  title,
  as: Tag = "p",
}: {
  icon: LucideIcon;
  title: string;
  as?: "p" | "h2";
}) {
  return (
    <Tag className="flex items-center gap-2 text-sm font-normal text-[#6b6b6b]">
      <Icon aria-hidden size={16} strokeWidth={2} className="shrink-0 text-ksa-teal-deep" />
      {title}
    </Tag>
  );
}

export function InfoCard({
  icon,
  title,
  children,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-white p-5 shadow-sm ${className}`}>
      <IconLabel icon={icon} title={title} />
      <div className="mt-2 text-base font-semibold leading-6 text-[#1c1c1c]">{children}</div>
    </div>
  );
}

export function ScopeLists({
  included,
  excluded,
  groups,
  groupClassName = "",
}: {
  included: string[];
  excluded: string[];
  groups: string[];
  groupClassName?: string;
}) {
  return (
    <>
      <InfoCard icon={Tags} title={countedTitle("Brand yang dihitung", included.length)}>
        <BulletList items={included} />
      </InfoCard>
      <InfoCard icon={Ban} title={countedTitle("Brand di luar scope", excluded.length)}>
        <BulletList items={excluded} />
      </InfoCard>
      <InfoCard icon={Layers} title={countedTitle("Group", groups.length)} className={groupClassName}>
        <BulletList items={groups} />
      </InfoCard>
    </>
  );
}

export function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span>—</span>;
  }
  return (
    <ul className="max-h-36 list-disc space-y-1 overflow-y-auto pr-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
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

export const fieldControlClass =
  "cursor-pointer rounded-xl border border-[#e7dfd2] bg-white text-sm text-[#1c1c1c] shadow-sm outline-none hover:border-ksa-teal/50 focus:border-ksa-teal focus:ring-2 focus:ring-ksa-teal/20 disabled:cursor-not-allowed disabled:opacity-50";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex min-w-0 align-middle ${className}`}>
      <select
        {...props}
        className={`w-full appearance-none py-2 pr-9 pl-3 transition-[border-color,box-shadow] duration-150 ${fieldControlClass}`}
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
  hidden,
}: {
  action: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form className="mt-4 flex max-w-xl gap-2" action={action}>
      {Object.entries(hidden ?? {}).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
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

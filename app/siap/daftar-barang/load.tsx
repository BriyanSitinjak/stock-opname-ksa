"use client";

import { LoadingMark } from "@/app/loading-mark";
import { useSiapQuery } from "@/app/siap/query";
import { ErrorText } from "@/app/siap/ui";
import { DaftarBrowse, type DaftarItem, type GudangChoice } from "./browse";

type Payload = {
  items: DaftarItem[];
  total: number;
  page: number;
  take: number;
};

type Choices = {
  gudang: GudangChoice[];
  brands: string[];
};

export function DaftarLoad({
  q,
  page,
  gudang,
  brand,
}: {
  q: string;
  page?: string;
  gudang: string;
  brand: string;
}) {
  const parsed = Number.parseInt(page ?? "1", 10);
  const items = useSiapQuery<Payload>("/api/master/items", {
    q,
    gudang_id: gudang,
    brand,
    page: Number.isFinite(parsed) ? parsed : 1,
  });
  const choices = useSiapQuery<Choices>("/api/master/item-choices");
  if (items.isPending || choices.isPending) {
    return <LoadingMark />;
  }
  if (items.isError || choices.isError || !items.data || !choices.data) {
    return <ErrorText>Daftar barang belum bisa dimuat.</ErrorText>;
  }
  return (
    <DaftarBrowse
      items={items.data.items}
      total={items.data.total}
      page={items.data.page}
      take={items.data.take}
      q={q}
      gudang={gudang}
      brand={brand}
      gudangChoices={choices.data.gudang}
      brandChoices={choices.data.brands}
    />
  );
}

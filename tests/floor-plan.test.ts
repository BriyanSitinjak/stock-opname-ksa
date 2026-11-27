import { describe, expect, it } from "vitest";
import {
  activePlaceCount,
  allFloorPlaces,
  floorAisles,
  floorByGudang,
  GUDANG_16_SLOTS,
  isFloorPlace,
  isFreeTextTagNomor,
} from "@/lib/floor-plan";
import { catalogWantedFloorTags, paddedRackNomor } from "@/lib/sync-floor-tags";

describe("floor plan", () => {
  it("zero-pads binlok on rack labels", () => {
    const floor = floorByGudang(17);
    expect(floor?.places.filter((place) => place.label === "B-12-A")).toHaveLength(1);
    expect(floor?.places.some((place) => place.label === "A-01-A")).toBe(true);
    expect(floor?.places.some((place) => place.label === "A-1-A")).toBe(false);
    expect(isFloorPlace("A-01-A")).toBe(true);
    expect(isFloorPlace("A-1-A")).toBe(false);
  });

  it("counts 140 rack positions on gudang 17", () => {
    const floor = floorByGudang(17);
    expect(floor?.places).toHaveLength(140);
    expect(floor?.places.some((place) => place.row === 17)).toBe(false);
    expect(floor?.places.some((place) => place.aisle === "A" && place.row === 9)).toBe(true);
    expect(floor?.places.some((place) => place.aisle === "B" && place.row === 9)).toBe(false);
  });

  it("exposes Gudang 16 as ten free-text slots without rack places", () => {
    const floor = floorByGudang(16);
    expect(floor?.freeText).toBe(true);
    expect(floor?.places).toHaveLength(0);
    expect(floor?.aisles).toHaveLength(0);
    expect(activePlaceCount(floor!)).toBe(GUDANG_16_SLOTS);
    const slots = floorAisles().filter((aisle) => aisle.gudang === 16);
    expect(slots).toHaveLength(10);
    expect(slots.map((aisle) => aisle.aisle)).toEqual([
      "S01",
      "S02",
      "S03",
      "S04",
      "S05",
      "S06",
      "S07",
      "S08",
      "S09",
      "S10",
    ]);
    expect(slots.map((aisle) => aisle.placeLabels[0])).toEqual([
      "G16-01",
      "G16-02",
      "G16-03",
      "G16-04",
      "G16-05",
      "G16-06",
      "G16-07",
      "G16-08",
      "G16-09",
      "G16-10",
    ]);
    expect(isFreeTextTagNomor("G16-01")).toBe(true);
    expect(isFreeTextTagNomor("G16-1")).toBe(false);
    expect(isFloorPlace("G16-01")).toBe(true);
  });

  it("spreads Area Transit sequentially across gudang 22→19", () => {
    const labels = (gudang: number) =>
      allFloorPlaces(floorByGudang(gudang)!)
        .map((place) => place.label)
        .filter((label) => label.startsWith("Transit-"));
    expect(labels(22)).toEqual([
      "Transit-1",
      "Transit-2-A",
      "Transit-2-B",
      "Transit-3",
      "Transit-4",
      "Transit-5-A",
      "Transit-5-B",
      "Transit-6-A",
      "Transit-6-B",
      "Transit-7",
    ]);
    expect(labels(21)).toEqual([
      "Transit-8-A",
      "Transit-8-B",
      "Transit-9-A",
      "Transit-9-B",
      "Transit-10-A",
      "Transit-10-B",
      "Transit-11-A",
      "Transit-11-B",
      "Transit-12-A",
      "Transit-12-B",
    ]);
    expect(labels(20)).toEqual([
      "Transit-13-A",
      "Transit-13-B",
      "Transit-14-A",
      "Transit-14-B",
      "Transit-15-A",
      "Transit-15-B",
      "Transit-16-A",
      "Transit-16-B",
      "Transit-17-A",
      "Transit-17-B",
    ]);
    expect(labels(19)).toEqual([
      "Transit-18",
      "Transit-19",
      "Transit-20",
      "Transit-21",
      "Transit-22",
      "Transit-23",
      "Transit-24",
      "Transit-25",
    ]);
    expect(labels(22).length + labels(21).length + labels(20).length + labels(19).length).toBe(38);
  });

  it("expands Gudang 21 U/V with Pretelan merge", () => {
    const floor = floorByGudang(21);
    const far = floor?.extras.find((band) => band.placement === "far");
    const labels = far?.places.map((place) => place.label) ?? [];
    expect(labels).toContain("U-01-B");
    expect(labels).toContain("U-10-A");
    expect(labels).toContain("Pretelan Barang Renovo");
    expect(labels).not.toContain("U");
    expect(labels).not.toContain("V");
    expect(labels).not.toContain("U-07-A");
    expect(labels).not.toContain("U-07-B");
    expect(labels).not.toContain("U-09-A");
    expect(labels.filter((label) => label.startsWith("V-"))).toHaveLength(52);
    expect(labels).toContain("V-01-A");
    expect(labels).toContain("V-13-A");
    expect(labels).not.toContain("V-13-B");
    expect(labels).toContain("V-28-A");
    expect(labels).not.toContain("V-28-B");
    expect(floor?.places.some((place) => place.aisle === "Q" && place.row === 6)).toBe(true);
    expect(floor?.places.some((place) => place.aisle === "R" && place.row === 6)).toBe(false);
    expect(floor?.places.some((place) => place.aisle === "R" && place.row === 9)).toBe(true);
  });

  it("keeps row 16 on gudang 22 to side A and names the gypsum bays", () => {
    const floor = floorByGudang(22);
    const row16 = floor?.places.filter((place) => place.row === 16) ?? [];
    expect(row16.every((place) => place.side === "A")).toBe(true);
    expect(row16.some((place) => place.side === "B")).toBe(false);
    expect(floor?.aisles.map((aisle) => aisle.label)).toEqual(["W", "X", "Y", "Z"]);
    expect(floor?.places.some((place) => place.label === "W-01-A")).toBe(true);
    expect(floor?.places.some((place) => place.label === "W-1-A")).toBe(false);
    expect(floor?.places.some((place) => place.label === "Z-16-A")).toBe(true);
    expect(floor?.places.some((place) => place.row === 18 || place.row === 19)).toBe(false);
    const door = floor?.extras.find((band) => band.placement === "door");
    expect(door?.places.slice(0, 5).map((place) => place.label)).toEqual([
      "20-A",
      "19-B",
      "19-A",
      "18-B",
      "18-A",
    ]);
  });

  it("draws rows 18–19 on gudang 18–21 as unavailable, not assignable", () => {
    for (const gudang of [18, 19, 20, 21]) {
      const floor = floorByGudang(gudang);
      const blocked = floor?.places.filter((place) => place.row === 18 || place.row === 19) ?? [];
      expect(blocked.length).toBeGreaterThan(0);
      expect(blocked.every((place) => place.unavailable)).toBe(true);
      expect(floor?.rows.includes(18)).toBe(true);
      expect(floor?.rows.includes(19)).toBe(true);
      expect(blocked.every((place) => !isFloorPlace(place.label))).toBe(true);
    }
  });

  it("pads legacy rack nomor and catalogs every assignable floor tag", () => {
    expect(paddedRackNomor("A-1-A")).toBe("A-01-A");
    expect(paddedRackNomor("A-01-A")).toBeNull();
    expect(paddedRackNomor("Transit-1")).toBeNull();
    const wanted = catalogWantedFloorTags();
    expect(wanted.some((row) => row.nomor === "G16-01")).toBe(true);
    expect(wanted.some((row) => row.nomor === "A-01-A")).toBe(true);
    expect(wanted.some((row) => row.nomor === "Transit-1")).toBe(true);
    expect(wanted.some((row) => row.nomor === "Pretelan Barang Renovo")).toBe(true);
    expect(wanted.some((row) => row.nomor === "V-13-A")).toBe(true);
    expect(wanted.some((row) => row.nomor === "V-13-B")).toBe(false);
  });
});

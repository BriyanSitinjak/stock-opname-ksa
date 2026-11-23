import { describe, expect, it } from "vitest";
import { floorByGudang } from "@/lib/floor-plan";

describe("floor plan", () => {
  it("counts 140 rack positions on gudang 17", () => {
    const floor = floorByGudang(17);
    expect(floor?.places).toHaveLength(140);
    expect(floor?.places.some((place) => place.row === 17)).toBe(false);
    expect(floor?.places.some((place) => place.aisle === "A" && place.row === 9)).toBe(true);
    expect(floor?.places.some((place) => place.aisle === "B" && place.row === 9)).toBe(false);
    expect(floor?.places.filter((place) => place.label === "B-12-A")).toHaveLength(1);
  });

  it("keeps one place each for U and V", () => {
    const floor = floorByGudang(21);
    expect(floor?.extras.places.map((place) => place.label)).toEqual(["V", "U"]);
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
    expect(floor?.places.some((place) => place.label === "W-1-A")).toBe(true);
    expect(floor?.places.some((place) => place.label === "Z-16-A")).toBe(true);
    expect(floor?.extras.places.map((place) => place.label)).toEqual(["20-A", "19-B", "19-A", "18-B", "18-A"]);
  });
});

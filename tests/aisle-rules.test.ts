import { describe, expect, it } from "vitest";
import { cardAlreadyUsed, missingAisleTasks, samePersonOnAisle } from "@/lib/aisle-rules";

const aisles = [
  { gudang: 17, aisle: "A", label: "A" },
  { gudang: 17, aisle: "B", label: "B" },
];

describe("aisle tasks", () => {
  it("skips a crossed aisle and still asks for the open one", () => {
    const missing = missingAisleTasks(
      aisles,
      [{ gudang: 17, aisle: "B", pass: 1, userId: "usr-1" }],
      [{ gudang: 17, aisle: "A", note: "kosong" }],
    );
    expect(missing).toEqual(["B di Gudang 17 belum ada hitung ke-2"]);
  });

  it("refuses the same person on both passes of one aisle", () => {
    expect(
      samePersonOnAisle([
        { gudang: 17, aisle: "A", pass: 1, userId: "usr-1" },
        { gudang: 17, aisle: "A", pass: 2, userId: "usr-1" },
      ]),
    ).toBeTruthy();
    expect(
      samePersonOnAisle([
        { gudang: 17, aisle: "A", pass: 1, userId: "usr-1" },
        { gudang: 18, aisle: "E", pass: 2, userId: "usr-1" },
      ]),
    ).toBeNull();
  });

  it("treats a card number as already used on this phone", () => {
    expect(cardAlreadyUsed(["K-18"], "k-18")).toBe(true);
    expect(cardAlreadyUsed(["K-18"], "K-19")).toBe(false);
  });
});

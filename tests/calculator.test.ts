import { describe, expect, it } from "vitest";
import { evaluateQtyNote } from "@/lib/calculator";

describe("calculator", () => {
  it("computes 12 × 24 + 3 as 291", () => {
    expect(evaluateQtyNote("12 × 24 + 3")).toBe("291");
  });

  it("rejects letters", () => {
    expect(evaluateQtyNote("12a")).toBeNull();
  });
});

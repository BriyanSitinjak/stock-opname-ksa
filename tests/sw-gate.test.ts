import { describe, expect, it } from "vitest";
import { canActivateWorker } from "@/lib/offline/sw-gate";

describe("service worker update gate", () => {
  it("blocks activation while the queue has rows", () => {
    expect(canActivateWorker(1)).toBe(false);
    expect(canActivateWorker(7)).toBe(false);
  });

  it("allows activation only when the queue is empty", () => {
    expect(canActivateWorker(0)).toBe(true);
  });
});

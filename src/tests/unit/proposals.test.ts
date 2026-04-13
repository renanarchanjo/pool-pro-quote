import { describe, it, expect } from "vitest";
import { calculateTotalPrice } from "@/lib/calculateProposal";

describe("calculateTotalPrice", () => {
  it("sums base + included + optionals", () => {
    const optionals = [{ price: 200 }, { price: 300 }, { price: 500 }];
    expect(calculateTotalPrice(10000, 1500, optionals)).toBe(12500);
  });

  it("returns base + included when no optionals", () => {
    expect(calculateTotalPrice(10000, 500, [])).toBe(10500);
  });

  it("handles zero includedItemsTotal", () => {
    expect(calculateTotalPrice(10000, 0, [{ price: 100 }])).toBe(10100);
  });

  it("returns 0 when all values are 0", () => {
    expect(calculateTotalPrice(0, 0, [])).toBe(0);
  });

  it("handles optionals with price 0", () => {
    const optionals = [{ price: 0 }, { price: 0 }];
    expect(calculateTotalPrice(5000, 1000, optionals)).toBe(6000);
  });

  it("handles realistic pool pricing", () => {
    // Base R$45.000 + included R$8.500 + optionals R$12.000
    const optionals = [
      { price: 3500 },
      { price: 4500 },
      { price: 2000 },
      { price: 2000 },
    ];
    expect(calculateTotalPrice(45000, 8500, optionals)).toBe(65500);
  });

  it("handles single optional", () => {
    expect(calculateTotalPrice(5000, 1000, [{ price: 750 }])).toBe(6750);
  });
});

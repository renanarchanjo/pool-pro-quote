import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizePhone, sanitizeCNPJ, sanitizeCurrency } from "@/lib/sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<b>bold</b>")).toBe("bold");
  });

  it("strips script tags (leaves inner text)", () => {
    expect(sanitizeText("<script>alert('xss')</script>")).toBe("alert('xss')");
  });

  it("strips javascript: URI patterns", () => {
    expect(sanitizeText("javascript:alert(1)")).not.toContain("javascript:");
  });

  it("strips event handlers", () => {
    expect(sanitizeText("onload=evil()")).not.toMatch(/onload\s*=/i);
  });

  it("respects maxLength", () => {
    const input = "a".repeat(600);
    expect(sanitizeText(input)).toHaveLength(500);
  });

  it("respects custom maxLength", () => {
    expect(sanitizeText("hello world", 5)).toHaveLength(5);
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("removes null bytes and control characters", () => {
    expect(sanitizeText("hello\x00world\x01")).toBe("helloworld");
  });

  it("preserves newlines and tabs", () => {
    expect(sanitizeText("hello\nworld\there")).toBe("hello\nworld\there");
  });
});

describe("sanitizePhone", () => {
  it("strips non-digit characters", () => {
    expect(sanitizePhone("(11) 99988-7766")).toBe("11999887766");
  });

  it("truncates to 11 characters", () => {
    expect(sanitizePhone("1234567890123")).toBe("12345678901");
  });

  it("handles empty string", () => {
    expect(sanitizePhone("")).toBe("");
  });
});

describe("sanitizeCNPJ", () => {
  it("strips non-digit characters", () => {
    expect(sanitizeCNPJ("12.345.678/0001-90")).toBe("12345678000190");
  });

  it("truncates to 14 characters", () => {
    expect(sanitizeCNPJ("123456789012345")).toBe("12345678901234");
  });
});

describe("sanitizeCurrency", () => {
  it("rounds to 2 decimal places", () => {
    expect(sanitizeCurrency(10.999)).toBe(11);
  });

  it("clamps negative to 0", () => {
    expect(sanitizeCurrency(-5)).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(sanitizeCurrency(NaN)).toBe(0);
  });

  it("returns 0 for zero", () => {
    expect(sanitizeCurrency(0)).toBe(0);
  });

  it("preserves clean values", () => {
    expect(sanitizeCurrency(99.99)).toBe(99.99);
  });

  it("fixes IEEE 754 floating point (0.1 + 0.2)", () => {
    expect(sanitizeCurrency(0.1 + 0.2)).toBe(0.3);
  });
});

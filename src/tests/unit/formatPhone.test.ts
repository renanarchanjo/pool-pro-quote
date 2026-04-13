import { describe, it, expect } from "vitest";
import { formatPhoneForWhatsApp } from "@/lib/formatPhone";

describe("formatPhoneForWhatsApp", () => {
  it("prepends 55 to DDD + 9-digit mobile", () => {
    expect(formatPhoneForWhatsApp("11987654321")).toBe("5511987654321");
  });

  it("strips formatting characters", () => {
    expect(formatPhoneForWhatsApp("(11) 98765-4321")).toBe("5511987654321");
  });

  it("does not duplicate 55 prefix when already present", () => {
    expect(formatPhoneForWhatsApp("5511987654321")).toBe("5511987654321");
  });

  it("strips trunk prefix 0 and prepends 55", () => {
    expect(formatPhoneForWhatsApp("011987654321")).toBe("5511987654321");
  });

  it("handles 10-digit landline (DDD + 8 digits)", () => {
    expect(formatPhoneForWhatsApp("1187654321")).toBe("551187654321");
  });

  it("handles empty string", () => {
    expect(formatPhoneForWhatsApp("")).toBe("55");
  });

  it("handles number with + prefix", () => {
    expect(formatPhoneForWhatsApp("+5511987654321")).toBe("5511987654321");
  });

  it("handles 55 prefix with less than 12 digits", () => {
    // "55" has length 2, which is < 12, so it falls to default: "55" + "55" = "5555"
    expect(formatPhoneForWhatsApp("55")).toBe("5555");
  });

  it("handles spaces and dashes", () => {
    expect(formatPhoneForWhatsApp("11 9 8765 4321")).toBe("5511987654321");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockToastError } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

import { validateImageFile } from "@/lib/validateImageFile";

beforeEach(() => {
  mockToastError.mockClear();
});

describe("validateImageFile", () => {
  it("accepts valid JPEG", () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toBe(true);
  });

  it("accepts valid PNG", () => {
    const file = new File(["data"], "photo.png", { type: "image/png" });
    expect(validateImageFile(file)).toBe(true);
  });

  it("accepts valid WebP", () => {
    const file = new File(["data"], "photo.webp", { type: "image/webp" });
    expect(validateImageFile(file)).toBe(true);
  });

  it("rejects invalid type (PDF)", () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect(validateImageFile(file)).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith("Formato inválido. Use JPEG, PNG ou WebP.");
  });

  it("rejects invalid type (GIF)", () => {
    const file = new File(["data"], "anim.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toBe(false);
  });

  it("rejects file larger than 5MB", () => {
    const bigContent = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([bigContent], "big.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith("A imagem deve ter no máximo 5MB.");
  });

  it("accepts file when MIME type is empty but extension is valid", () => {
    const file = new File(["data"], "photo.png", { type: "" });
    expect(validateImageFile(file)).toBe(true);
  });

  it("rejects file with invalid MIME and invalid extension", () => {
    const file = new File(["data"], "file.xyz", { type: "application/octet-stream" });
    expect(validateImageFile(file)).toBe(false);
  });
});

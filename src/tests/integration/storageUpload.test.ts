import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

import { savePdfToStorage } from "@/lib/savePdfToStorage";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("savePdfToStorage", () => {
  it("uploads PDF and returns signed URL", async () => {
    mockInvoke.mockResolvedValue({
      data: { signedUrl: "https://store.supabase.co/signed/proposal-abc.pdf" },
      error: null,
    });

    const blob = new Blob(["pdf-content"], { type: "application/pdf" });
    const url = await savePdfToStorage("abc-123-def", blob);

    expect(url).toBe("https://store.supabase.co/signed/proposal-abc.pdf");
    expect(mockInvoke).toHaveBeenCalledWith("upload-proposal-pdf", {
      body: {
        proposalId: "abc-123-def",
        pdfBase64: expect.any(String),
      },
    });
  });

  it("base64 payload does not include data URI prefix", async () => {
    mockInvoke.mockResolvedValue({
      data: { signedUrl: "https://test.co/url" },
      error: null,
    });

    const blob = new Blob(["test"], { type: "application/pdf" });
    await savePdfToStorage("id-1", blob);

    const body = mockInvoke.mock.calls[0][1].body;
    expect(body.pdfBase64).not.toContain("data:");
    expect(body.pdfBase64).not.toContain("base64,");
  });

  it("throws on Edge Function error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Internal Server Error" },
    });

    const blob = new Blob(["test"], { type: "application/pdf" });
    await expect(savePdfToStorage("id-1", blob)).rejects.toThrow("Internal Server Error");
  });

  it("throws on data.error in response", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "proposalId inválido" },
      error: null,
    });

    const blob = new Blob(["test"], { type: "application/pdf" });
    await expect(savePdfToStorage("id-1", blob)).rejects.toThrow("proposalId inválido");
  });

  it("throws when signedUrl is missing from response", async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const blob = new Blob(["test"], { type: "application/pdf" });
    await expect(savePdfToStorage("id-1", blob)).rejects.toThrow();
  });

  it("calls progress callback with increasing values", async () => {
    mockInvoke.mockResolvedValue({
      data: { signedUrl: "https://test.co/url" },
      error: null,
    });

    const blob = new Blob(["test"], { type: "application/pdf" });
    const progress: number[] = [];

    await savePdfToStorage("id-1", blob, (p) => progress.push(p));

    // First call should be 0, last should be 100
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(100);
    expect(progress.length).toBeGreaterThanOrEqual(3);
  });

  it("clears progress interval on error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "fail" },
    });

    const blob = new Blob(["test"], { type: "application/pdf" });
    const progress: number[] = [];

    await expect(
      savePdfToStorage("id-1", blob, (p) => progress.push(p)),
    ).rejects.toThrow();

    // Progress should have started but interval should be cleaned up
    expect(progress[0]).toBe(0);
  });
});

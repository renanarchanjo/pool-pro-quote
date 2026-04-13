import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ── Supabase mock setup ──
let authChangeCallback: (event: string, session: unknown) => void;
const mockUnsubscribe = vi.fn();
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authChangeCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useStoreData } from "@/hooks/useStoreData";

// Helper to create chainable query mock
function queryChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

const mockProfile = { id: "user-1", store_id: "store-1", full_name: "Test User" };
const mockStore = { id: "store-1", name: "Test Store", slug: "test", city: "SP", state: "SP", whatsapp: null, plan_status: "active", plan_expires_at: null, nome_fantasia: "Test" };
const mockSettings = { logo_url: null, primary_color: "#000", secondary_color: "#fff" };
const mockRole = { role: "owner" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("useStoreData", () => {
  it("fetches and returns all store data when user is authenticated", async () => {
    // Set up from() to return different data based on table name
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return queryChain(mockProfile);
      if (table === "stores") return queryChain(mockStore);
      if (table === "store_settings") return queryChain(mockSettings);
      if (table === "user_roles") return queryChain(mockRole);
      return queryChain(null);
    });

    const { result } = renderHook(() => useStoreData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.store).toEqual(mockStore);
    expect(result.current.storeSettings).toEqual(mockSettings);
    expect(result.current.role).toBe("owner");
  });

  it("resets state when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useStoreData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.store).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it("verifyRole returns true when role matches", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return queryChain(mockProfile);
      if (table === "stores") return queryChain(mockStore);
      if (table === "store_settings") return queryChain(mockSettings);
      if (table === "user_roles") return queryChain(mockRole);
      return queryChain(null);
    });

    const { result } = renderHook(() => useStoreData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const isOwner = await result.current.verifyRole("owner");
    expect(isOwner).toBe(true);
  });

  it("verifyRole returns false when role does not match", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return queryChain(mockProfile);
      if (table === "stores") return queryChain(mockStore);
      if (table === "store_settings") return queryChain(mockSettings);
      if (table === "user_roles") return queryChain(mockRole);
      return queryChain(null);
    });

    const { result } = renderHook(() => useStoreData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const isSuperAdmin = await result.current.verifyRole("super_admin");
    expect(isSuperAdmin).toBe(false);
  });
});

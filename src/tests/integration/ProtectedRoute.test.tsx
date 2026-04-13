import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Supabase mock setup ──
const mockGetSession = vi.fn();
const mockMfaGetLevel = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => mockMfaGetLevel(...args),
      },
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import ProtectedRoute from "@/components/ProtectedRoute";

function queryChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function renderWithRouter(
  element: React.ReactNode,
  initialEntry = "/protected",
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/protected" element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/loginmatriz" element={<div>MFA Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMfaGetLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
});

describe("ProtectedRoute", () => {
  it("redirects to /login when not authenticated", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("renders children when authenticated (no role required)", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  it("renders children when role matches", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mockFrom.mockReturnValue(queryChain({ role: "owner" }));

    renderWithRouter(
      <ProtectedRoute requiredRole="owner">
        <div>Owner Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("Owner Content")).toBeInTheDocument();
    });
  });

  it("redirects to forbiddenRedirect when role does not match", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mockFrom.mockReturnValue(queryChain({ role: "seller" }));

    renderWithRouter(
      <ProtectedRoute requiredRole="owner" forbiddenRedirect="/">
        <div>Owner Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });

  it("allows super_admin to access any role-protected route", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mockFrom.mockReturnValue(queryChain({ role: "super_admin" }));
    mockMfaGetLevel.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null,
    });

    renderWithRouter(
      <ProtectedRoute requiredRole="owner">
        <div>Owner Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("Owner Content")).toBeInTheDocument();
    });
  });

  it("redirects super_admin without MFA to loginmatriz", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mockFrom.mockReturnValue(queryChain({ role: "super_admin" }));
    mockMfaGetLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });

    renderWithRouter(
      <ProtectedRoute requiredRole="super_admin">
        <div>Admin Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("MFA Page")).toBeInTheDocument();
    });
  });

  it("redirects when user has no role data", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mockFrom.mockReturnValue(queryChain(null));

    renderWithRouter(
      <ProtectedRoute requiredRole="owner" forbiddenRedirect="/">
        <div>Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });
});

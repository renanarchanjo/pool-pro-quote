import { lazy, Suspense, useEffect } from "react";
import * as Sentry from "@sentry/react";
import CookieBanner from "@/components/CookieBanner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import PageTransition from "@/components/PageTransition";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuspenseFallback from "@/components/SuspenseFallback";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { useMobileKeyboard } from "@/hooks/useMobileKeyboard";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";

// Eager load landing page for instant first paint
import Index from "./pages/Index";

// Lazy load all other pages
const MobileApp = lazy(() => import("./pages/MobileApp"));
const Login = lazy(() => import("./pages/Login"));
const LoginMatriz = lazy(() => import("./pages/LoginMatriz"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Matriz = lazy(() => import("./pages/Matriz"));

const Parceiros = lazy(() => import("./pages/Parceiros"));
const Lojista = lazy(() => import("./pages/Lojista"));
const LojistaPlanos = lazy(() => import("./pages/LojistaPlanos"));
const SimuladorLoja = lazy(() => import("./pages/SimuladorLoja"));
const QuizConstrucao = lazy(() => import("./pages/QuizConstrucao"));
const Links = lazy(() => import("./pages/Links"));
const TestProposal = lazy(() => import("./pages/TestProposal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      networkMode: "online",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

/** Redirect to /login on session expiry (global listener) */
function useAuthRedirect() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Only redirect if currently on a protected route
        const path = window.location.pathname;
        if (path.startsWith("/admin") || path.startsWith("/matriz")) {
          window.location.href = "/login";
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);
}

const AppInner = () => {
  useAuthRedirect();
  useMobileKeyboard();
  useRoutePrefetch();

  return (
    <BrowserRouter>
      <Sentry.ErrorBoundary
        fallback={({ resetError }) => (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, padding: 24 }}>
            <h2>Algo deu errado</h2>
            <p style={{ color: "#6B7280", textAlign: "center" }}>Nossa equipe foi notificada automaticamente.</p>
            <button onClick={resetError} style={{ padding: "8px 24px", borderRadius: 8, background: "#0ea5e9", color: "#fff", border: "none", cursor: "pointer" }}>Tentar novamente</button>
          </div>
        )}
        showDialog={false}
      >
      <Suspense fallback={<SuspenseFallback />}>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/links" element={<Links />} />
            <Route path="/s/:slug" element={<SimuladorLoja />} />
            <Route path="/test-proposal" element={<TestProposal />} />

            <Route path="/parceiros" element={<Parceiros />} />
            <Route path="/lojista" element={<Lojista />} />
            <Route path="/lojista/planos" element={<LojistaPlanos />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected: requires owner or seller role (Admin page handles role internally) */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute forbiddenRedirect="/login">
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* Protected: requires super_admin role */}
            <Route
              path="/matriz/*"
              element={
                <ProtectedRoute requiredRole="super_admin" forbiddenRedirect="/">
                  <Matriz />
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<Login />} />
            <Route path="/login/app" element={<MobileApp />} />
            <Route path="/loginmatriz" element={<LoginMatriz />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </Suspense>
      </Sentry.ErrorBoundary>
      <CookieBanner />
    </BrowserRouter>
  );
};

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <Toaster />
          <Sonner />
          <AppInner />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;

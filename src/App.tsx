import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import PageTransition from "@/components/PageTransition";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuspenseFallback from "@/components/SuspenseFallback";
import { supabase } from "@/integrations/supabase/client";

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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
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

  return (
    <BrowserRouter>
      <Suspense fallback={<SuspenseFallback />}>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/s/:slug" element={<SimuladorLoja />} />

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
    </BrowserRouter>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

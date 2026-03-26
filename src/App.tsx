import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import PageTransition from "@/components/PageTransition";

// Eager load landing page for instant first paint
import Index from "./pages/Index";

// Lazy load all other pages
const MobileApp = lazy(() => import("./pages/MobileApp"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Matriz = lazy(() => import("./pages/Matriz"));
const Lojista = lazy(() => import("./pages/Lojista"));
const Parceiros = lazy(() => import("./pages/Parceiros"));
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

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/lojista" element={<Lojista />} />
                <Route path="/parceiros" element={<Parceiros />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/*" element={<Admin />} />
                <Route path="/matriz/*" element={<Matriz />} />
                <Route path="/login/app" element={<MobileApp />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

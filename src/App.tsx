import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

// Eager load landing page for instant first paint
import Index from "./pages/Index";

// Lazy load all other pages
const MobileApp = lazy(() => import("./pages/MobileApp"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Matriz = lazy(() => import("./pages/Matriz"));
const Precos = lazy(() => import("./pages/Precos"));
const Parceiros = lazy(() => import("./pages/Parceiros"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min - avoid refetching on every mount
      gcTime: 1000 * 60 * 10, // 10 min garbage collection
      refetchOnWindowFocus: false, // don't refetch on tab switch
      retry: 1, // only 1 retry on failure
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/precos" element={<Precos />} />
              <Route path="/parceiros" element={<Parceiros />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/*" element={<Admin />} />
              <Route path="/matriz/*" element={<Matriz />} />
              <Route path="/login/app" element={<MobileApp />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminSidebarContent from "@/components/admin/AdminSidebarContent";
import FloatingPanel from "@/components/admin/FloatingPanel";
import { useStoreData } from "@/hooks/useStoreData";
import PendingLeadsAlert from "@/components/admin/PendingLeadsAlert";
import MobileBottomNav from "@/components/admin/MobileBottomNav";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import BrandLogo from "@/components/BrandLogo";
import HeaderPlanBadge from "@/components/admin/HeaderPlanBadge";
import OwnerOnboardingModal from "@/components/admin/OwnerOnboardingModal";

// Lazy load ALL sub-pages for smaller initial bundle
const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"));
const BrandsAndCategoriesPage = lazy(() => import("@/components/admin/BrandsAndCategoriesPage"));
const AdminClients = lazy(() => import("@/components/admin/AdminClients"));
const PoolModelManager = lazy(() => import("@/components/admin/PoolModelManager"));
const OptionalManager = lazy(() => import("@/components/admin/OptionalManager"));
const AdminProfile = lazy(() => import("@/components/admin/AdminProfile"));
const ManualProposal = lazy(() => import("@/components/admin/ManualProposal"));
const StoresManager = lazy(() => import("@/components/admin/StoresManager"));
const TeamManager = lazy(() => import("@/components/admin/TeamManager"));
const TeamPerformance = lazy(() => import("@/components/admin/TeamPerformance"));
const TeamCommissions = lazy(() => import("@/components/admin/TeamCommissions"));
const SubscriptionManager = lazy(() => import("@/components/admin/SubscriptionManager"));
const AdminLeads = lazy(() => import("@/components/admin/AdminLeads"));
const InvoiceHistory = lazy(() => import("@/components/admin/InvoiceHistory"));
const StorePartnersManager = lazy(() => import("@/components/admin/StorePartnersManager"));
const ContractsManager = lazy(() => import("@/components/admin/ContractsManager"));

const SubpageFallback = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard",
  "gerar-proposta": "Gerar Proposta",
  "leads": "Leads (SimulaPool)",
  "clientes": "Clientes (Follow-up)",
  "faturas": "Faturas",
  "perfil": "Minha Conta",
  "marcas": "Marcas e Categorias",
  "modelos": "Modelos",
  "opcionais": "Opcionais",
  "equipe": "Equipe",
  "lojistas": "Lojistas",
  "assinatura": "Assinatura",
  "parceiros": "Marcas Parceiras",
  "performance": "Performance",
  "comissao": "Comissão",
  "contratos": "Contratos",
};

const Admin = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { store, role, loading: storeLoading } = useStoreData();

  const path = location.pathname.replace("/admin", "").replace(/^\//, "");
  const pageTitle = PAGE_TITLES[path] || "Dashboard";

  // Close panel on route change
  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (cancelled) return;
      if (!roleData?.role) { navigate("/login"); return; }
      if (roleData.role === "super_admin") { navigate("/matriz", { replace: true }); return; }
      if (roleData.role !== "owner" && roleData.role !== "seller") { navigate("/login"); return; }

      setAuthLoading(false);
    };
    checkAuth();
    return () => { cancelled = true; };
  }, [navigate]);

  if (authLoading || storeLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    const handleLogoutAndRetry = async () => {
      await supabase.auth.signOut();
      navigate("/auth");
    };

    return (
      <div className="h-full flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <p className="text-base font-semibold text-foreground mb-2">Nenhuma loja vinculada</p>
          <p className="text-sm text-muted-foreground mb-6">Faça login com uma conta que possua uma loja cadastrada.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao Início</Button>
            <Button onClick={handleLogoutAndRetry}>Trocar de Conta</Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = role === "owner";

  return (
    <div className="h-dvh flex flex-col w-full bg-secondary overflow-hidden">
      {/* App Header */}
      <header
        className="relative flex items-center justify-between border-b border-border bg-background px-4 shrink-0"
        style={{ height: 'calc(56px + var(--safe-area-top))', paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="flex-1 min-w-0" />

        {/* Centered brand text */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ marginTop: 'calc(var(--safe-area-top) / 2)' }}>
          <span className="text-[20px] font-bold tracking-[-0.02em] leading-none">
            <span className="text-foreground">Simula</span>
            <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Pool</span>
          </span>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 relative z-10">
          {role === "owner" && store?.id && <HeaderPlanBadge storeId={store.id} />}
          <button
            onClick={() => setPanelOpen(true)}
            className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:border-primary/30 transition-all duration-150"
          >
            <MenuIcon className="w-4 h-4" strokeWidth={1.5} />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Scrollable content area */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0"
        style={{ paddingBottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 8px)' }}
      >
        <div className="p-4 md:p-6">
          <PendingLeadsAlert />
          <Suspense fallback={<SubpageFallback />}>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="gerar-proposta" element={<ManualProposal />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="clientes" element={<AdminClients />} />
              <Route path="faturas" element={<InvoiceHistory />} />
              <Route path="contratos" element={<ContractsManager />} />
              <Route path="perfil" element={<AdminProfile />} />
              {!isOwner && (
                <>
                  <Route path="performance" element={<TeamPerformance />} />
                  <Route path="comissao" element={<TeamCommissions />} />
                </>
              )}
              {isOwner && (
                <>
                  <Route path="marcas" element={<BrandsAndCategoriesPage />} />
                  <Route path="modelos" element={<PoolModelManager />} />
                  <Route path="opcionais" element={<OptionalManager />} />
                  <Route path="equipe" element={<TeamManager />} />
                  <Route path="lojistas" element={<StoresManager />} />
                  <Route path="assinatura" element={<SubscriptionManager />} />
                  <Route path="parceiros" element={<StorePartnersManager />} />
                </>
              )}
            </Routes>
          </Suspense>
        </div>
      </main>

      <MobileBottomNav />
      <PwaInstallBanner />
      <NotificationPrompt />
      {role === "owner" && userId && (
        <OwnerOnboardingModal userId={userId} storeId={store?.id} storeName={store?.name} />
      )}

      {/* Desktop floating panel */}
      <FloatingPanel open={panelOpen} onClose={() => setPanelOpen(false)}>
        <AdminSidebarContent onNavigate={() => setPanelOpen(false)} />
      </FloatingPanel>
    </div>
  );
};

export default Admin;

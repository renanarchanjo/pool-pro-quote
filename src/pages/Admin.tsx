import { useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminSidebarContent from "@/components/admin/AdminSidebarContent";
import FloatingPanel from "@/components/admin/FloatingPanel";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BrandCategoryManager from "@/components/admin/BrandCategoryManager";
import PoolModelManager from "@/components/admin/PoolModelManager";
import OptionalManager from "@/components/admin/OptionalManager";
import AdminProfile from "@/components/admin/AdminProfile";
import ManualProposal from "@/components/admin/ManualProposal";
import StoresManager from "@/components/admin/StoresManager";
import TeamManager from "@/components/admin/TeamManager";
import TeamPerformance from "@/components/admin/TeamPerformance";
import TeamCommissions from "@/components/admin/TeamCommissions";
import SubscriptionManager from "@/components/admin/SubscriptionManager";
import AdminLeads from "@/components/admin/AdminLeads";
import InvoiceHistory from "@/components/admin/InvoiceHistory";
import StorePartnersManager from "@/components/admin/StorePartnersManager";
import { useStoreData } from "@/hooks/useStoreData";
import PendingLeadsAlert from "@/components/admin/PendingLeadsAlert";
import MobileBottomNav from "@/components/admin/MobileBottomNav";
import PwaInstallBanner from "@/components/PwaInstallBanner";

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard",
  "gerar-proposta": "Gerar Proposta",
  "leads": "Leads",
  "faturas": "Faturas",
  "perfil": "Minha Conta",
  "marcas": "Marcas",
  "categorias": "Categorias de Marcas",
  "modelos": "Modelos",
  "opcionais": "Opcionais",
  "equipe": "Minha Equipe",
  "lojistas": "Lojistas",
  "assinatura": "Assinatura",
  "parceiros": "Marcas Parceiras",
  "performance": "Performance",
  "comissao": "Comissão",
};

const Admin = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
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
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (!roleData?.role) { navigate("/login"); return; }
      if (roleData.role === "super_admin") { navigate("/matriz", { replace: true }); return; }
      if (roleData.role !== "owner" && roleData.role !== "seller") { navigate("/login"); return; }

      setAuthLoading(false);
    };
    checkAuth();
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
        className="flex items-center justify-between border-b border-border bg-background px-4 shrink-0"
        style={{ height: 'calc(56px + var(--safe-area-top))', paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] md:text-[18px] font-semibold text-foreground truncate">{pageTitle}</h1>
        </div>
        {/* Desktop menu trigger */}
        <button
          onClick={() => setPanelOpen(true)}
          className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:border-primary/30 transition-all duration-150"
        >
          <MenuIcon className="w-4 h-4" strokeWidth={1.5} />
          <span>Menu</span>
        </button>
      </header>

      {/* Scrollable content area */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0"
        style={{ paddingBottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 8px)' }}
      >
        <div className="p-4 md:p-6">
          <PendingLeadsAlert />
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="gerar-proposta" element={<ManualProposal />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="faturas" element={<InvoiceHistory />} />
            <Route path="perfil" element={<AdminProfile />} />
            {!isOwner && (
              <>
                <Route path="performance" element={<TeamPerformance />} />
                <Route path="comissao" element={<TeamCommissions />} />
              </>
            )}
            {isOwner && (
              <>
                <Route path="marcas" element={<BrandCategoryManager mode="brands" />} />
                <Route path="categorias" element={<BrandCategoryManager mode="categories" />} />
                <Route path="modelos" element={<PoolModelManager />} />
                <Route path="opcionais" element={<OptionalManager />} />
                <Route path="equipe" element={<TeamManager />} />
                <Route path="lojistas" element={<StoresManager />} />
                <Route path="assinatura" element={<SubscriptionManager />} />
                <Route path="parceiros" element={<StorePartnersManager />} />
              </>
            )}
          </Routes>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
      <PwaInstallBanner />

      {/* Desktop floating panel */}
      <FloatingPanel open={panelOpen} onClose={() => setPanelOpen(false)}>
        <AdminSidebarContent onNavigate={() => setPanelOpen(false)} />
      </FloatingPanel>
    </div>
  );
};

export default Admin;

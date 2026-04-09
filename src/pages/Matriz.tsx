import { useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Menu as MenuIcon } from "lucide-react";
import MatrizSidebarContent from "@/components/matriz/MatrizSidebarContent";
import FloatingPanel from "@/components/admin/FloatingPanel";
import MatrizMobileBottomNav from "@/components/matriz/MatrizMobileBottomNav";
import MatrizDashboard from "@/components/matriz/MatrizDashboard";
import MatrizStores from "@/components/matriz/MatrizStores";
import MatrizPayments from "@/components/matriz/MatrizPayments";
import PartnersManager from "@/components/matriz/PartnersManager";
import MatrizLeads from "@/components/matriz/MatrizLeads";
import MatrizPlans from "@/components/matriz/MatrizPlans";
import MatrizMapPage from "@/components/matriz/MatrizMapPage";
import MatrizReports from "@/components/matriz/MatrizReports";
import MatrizInadimplencia from "@/components/matriz/MatrizInadimplencia";

const PAGE_TITLES: Record<string, string> = {
  "": "Dashboard Financeiro",
  "lojas": "Lojas Cadastradas",
  "lojistas": "Lojistas Ativos",
  "pagamentos": "Pagamentos",
  "parceiros": "Parceiros",
  "leads": "Leads",
  "planos": "Planos e Preços",
  "mapa": "Mapa de Lojistas",
  "inadimplencia": "Inadimplência",
  "relatorios": "Relatórios",
};

const Matriz = () => {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname.replace("/matriz", "").replace(/^\//, "");
  const pageTitle = PAGE_TITLES[path] || "Dashboard Financeiro";

  // Close panel on route change
  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: roleData } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "super_admin").single();

      if (!roleData) { navigate("/admin"); return; }
      setIsSuperAdmin(true);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

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
          <Routes>
            <Route index element={<MatrizDashboard />} />
            <Route path="lojas" element={<MatrizStores />} />
            <Route path="lojistas" element={<MatrizStores />} />
            <Route path="pagamentos" element={<MatrizPayments />} />
            <Route path="parceiros" element={<PartnersManager />} />
            <Route path="leads" element={<MatrizLeads />} />
            <Route path="planos" element={<MatrizPlans />} />
            <Route path="mapa" element={<MatrizMapPage />} />
            <Route path="inadimplencia" element={<MatrizInadimplencia />} />
            <Route path="relatorios" element={<MatrizReports />} />
          </Routes>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MatrizMobileBottomNav />

      {/* Desktop floating panel */}
      <FloatingPanel open={panelOpen} onClose={() => setPanelOpen(false)}>
        <MatrizSidebarContent onNavigate={() => setPanelOpen(false)} />
      </FloatingPanel>
    </div>
  );
};

export default Matriz;

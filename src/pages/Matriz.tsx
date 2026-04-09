import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PanelLeftClose, PanelLeft } from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import MatrizSidebar from "@/components/matriz/MatrizSidebar";
import MatrizDashboard from "@/components/matriz/MatrizDashboard";
import MatrizStores from "@/components/matriz/MatrizStores";
import MatrizPayments from "@/components/matriz/MatrizPayments";
import PartnersManager from "@/components/matriz/PartnersManager";
import MatrizLeads from "@/components/matriz/MatrizLeads";
import MatrizPlans from "@/components/matriz/MatrizPlans";
import MatrizMapPage from "@/components/matriz/MatrizMapPage";
import MatrizReports from "@/components/matriz/MatrizReports";
import MatrizInadimplencia from "@/components/matriz/MatrizInadimplencia";

const Matriz = () => {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navigate = useNavigate();

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <MatrizSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MatrizTopBar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto safe-area-bottom">
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const MatrizTopBar = () => {
  const { toggleSidebar, open } = useSidebar();
  return (
    <header className="h-11 flex items-center border-b border-border px-3 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title={open ? "Fechar sidebar" : "Abrir sidebar"}
      >
        {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </button>
    </header>
  );
};

export default Matriz;

import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import MatrizSidebar from "@/components/matriz/MatrizSidebar";
import MatrizDashboard from "@/components/matriz/MatrizDashboard";
import MatrizStores from "@/components/matriz/MatrizStores";
import MatrizPayments from "@/components/matriz/MatrizPayments";
import PartnersManager from "@/components/matriz/PartnersManager";
import MatrizLeads from "@/components/matriz/MatrizLeads";
import MatrizPlans from "@/components/matriz/MatrizPlans";
import MatrizMapPage from "@/components/matriz/MatrizMapPage";
import MatrizReports from "@/components/matriz/MatrizReports";

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
      <div className="min-h-screen flex w-full bg-[#F8F9FA] overflow-x-hidden">
        <MatrizSidebar />
        <div className="flex-1 flex flex-col min-w-0">
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
              <Route path="relatorios" element={<MatrizReports />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Matriz;

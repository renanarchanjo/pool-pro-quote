import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import CategoryManager from "@/components/admin/CategoryManager";
import PoolModelManager from "@/components/admin/PoolModelManager";
import OptionalGroupManager from "@/components/admin/OptionalGroupManager";
import OptionalManager from "@/components/admin/OptionalManager";
import ProposalsView from "@/components/admin/ProposalsView";
import StoreSettings from "@/components/admin/StoreSettings";
import AdminProfile from "@/components/admin/AdminProfile";
import { useStoreData } from "@/hooks/useStoreData";

const Admin = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStoreData();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (authLoading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Loja não encontrada</p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/50 bg-background px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="propostas" element={<ProposalsView />} />
              <Route path="categorias" element={<CategoryManager />} />
              <Route path="grupos" element={<OptionalGroupManager />} />
              <Route path="opcionais" element={<OptionalManager />} />
              <Route path="modelos" element={<PoolModelManager />} />
              <Route path="perfil" element={<AdminProfile />} />
              <Route path="configuracoes" element={<StoreSettings />} />
              <Route path="lojistas" element={<div><h1 className="text-3xl font-bold mb-4">Lojistas</h1><p className="text-muted-foreground">Gerenciamento de lojistas em breve.</p></div>} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;

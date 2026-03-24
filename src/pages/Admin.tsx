import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BrandCategoryManager from "@/components/admin/BrandCategoryManager";
import PoolModelManager from "@/components/admin/PoolModelManager";
import OptionalManager from "@/components/admin/OptionalManager";
import AdminProfile from "@/components/admin/AdminProfile";
import ManualProposal from "@/components/admin/ManualProposal";
import StoresManager from "@/components/admin/StoresManager";
import TeamManager from "@/components/admin/TeamManager";
import SubscriptionManager from "@/components/admin/SubscriptionManager";
import AdminLeads from "@/components/admin/AdminLeads";
import { useStoreData } from "@/hooks/useStoreData";
import PendingLeadsAlert from "@/components/admin/PendingLeadsAlert";

const Admin = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const { store, role, loading: storeLoading } = useStoreData();

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
    const handleLogoutAndRetry = async () => {
      await supabase.auth.signOut();
      navigate("/auth");
    };

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Nenhuma loja vinculada a esta conta.</p>
          <p className="text-sm text-muted-foreground mb-6">Faça login com uma conta que possua uma loja cadastrada.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao Início</Button>
            <Button onClick={handleLogoutAndRetry} className="gradient-primary text-white">
              Trocar de Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = role === "owner";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30 overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center border-b border-border/50 bg-background px-2 md:px-4 h-[72px] pt-[env(safe-area-inset-top,0px)]">
            <SidebarTrigger className="h-14 w-14 md:h-10 md:w-10 [&>svg]:!w-7 [&>svg]:!h-7 md:[&>svg]:!w-5 md:[&>svg]:!h-5 text-primary shrink-0" />
            <span className="ml-2 text-sm font-medium text-primary md:hidden truncate">{store?.name || "Painel"}</span>
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-x-hidden overflow-y-auto safe-area-bottom">
            <PendingLeadsAlert />
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="gerar-proposta" element={<ManualProposal />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="perfil" element={<AdminProfile />} />
              {/* Owner-only routes */}
              {isOwner && (
                <>
                  <Route path="marcas" element={<BrandCategoryManager />} />
                  <Route path="modelos" element={<PoolModelManager />} />
                  <Route path="opcionais" element={<OptionalManager />} />
                  <Route path="equipe" element={<TeamManager />} />
                  <Route path="lojistas" element={<StoresManager />} />
                  <Route path="assinatura" element={<SubscriptionManager />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;

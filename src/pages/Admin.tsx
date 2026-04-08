import { useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
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
import TeamPerformance from "@/components/admin/TeamPerformance";
import TeamCommissions from "@/components/admin/TeamCommissions";
import SubscriptionManager from "@/components/admin/SubscriptionManager";
import AdminLeads from "@/components/admin/AdminLeads";
import InvoiceHistory from "@/components/admin/InvoiceHistory";
import StorePartnersManager from "@/components/admin/StorePartnersManager";
import { useStoreData } from "@/hooks/useStoreData";
import PendingLeadsAlert from "@/components/admin/PendingLeadsAlert";
import MobileBottomNav from "@/components/admin/MobileBottomNav";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { store, role, loading: storeLoading } = useStoreData();

  const path = location.pathname.replace("/admin", "").replace(/^\//, "");
  const pageTitle = PAGE_TITLES[path] || "Dashboard";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (authLoading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (!store) {
    const handleLogoutAndRetry = async () => {
      await supabase.auth.signOut();
      navigate("/auth");
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] px-4">
        <div className="text-center max-w-md">
          <p className="text-base font-semibold text-[#0D0D0D] mb-2">Nenhuma loja vinculada</p>
          <p className="text-sm text-[#6B7280] mb-6">Faça login com uma conta que possua uma loja cadastrada.</p>
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F8F9FA] overflow-x-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* App Header — 56px */}
          <header className="flex items-center border-b border-[#E5E7EB] bg-[#FFFFFF] px-4 h-14 pt-[env(safe-area-inset-top,0px)]">
            <SidebarTrigger className="hidden md:flex h-9 w-9 [&>svg]:!w-5 [&>svg]:!h-5 text-[#6B7280] hover:text-[#0D0D0D] shrink-0 rounded-lg transition-all duration-150" />
            <div className="md:ml-3 flex-1 min-w-0">
              <h1 className="text-[16px] md:text-[18px] font-semibold text-[#0D0D0D] truncate">{pageTitle}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto pb-20 md:pb-6">
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
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default Admin;

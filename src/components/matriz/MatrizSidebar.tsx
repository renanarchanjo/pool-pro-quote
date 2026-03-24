import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Store, CreditCard, LogOut, Handshake, Users, Settings } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

const MatrizSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/matriz") return location.pathname === "/matriz";
    return location.pathname.startsWith(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/");
  };

  const items = [
    { title: "Dashboard Financeiro", url: "/matriz", icon: LayoutDashboard },
    { title: "Lojas Cadastradas", url: "/matriz/lojas", icon: Store },
    { title: "Pagamentos", url: "/matriz/pagamentos", icon: CreditCard },
    { title: "Parceiros", url: "/matriz/parceiros", icon: Handshake },
    { title: "Leads", url: "/matriz/leads", icon: Users },
    { title: "Planos e Preços", url: "/matriz/planos", icon: Settings },
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex flex-col items-center gap-1">
          <img src={logoHorizontal} alt="SIMULAPOOL" className="h-10 object-contain" />
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">MATRIZ</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>GESTÃO</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MatrizSidebar;

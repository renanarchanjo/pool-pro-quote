import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Store, CreditCard, LogOut, Handshake, Users, Settings } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import simulapoolIcon from "@/assets/simulapool-icon.png";

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
      <SidebarHeader className="border-b border-border/50 h-[72px] flex items-center">
        <div className="flex items-center gap-3 px-5 w-full">
          <img src={simulapoolIcon} alt="SimulaPool" className="h-11 w-11 object-contain rounded-xl" />
          <div className="flex flex-col">
            <span className="text-base font-bold text-primary leading-tight">Simula Pool</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Painel Matriz</span>
          </div>
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
                    className="cursor-pointer min-h-[48px] md:min-h-0 text-base md:text-sm"
                  >
                    <item.icon className="w-5 h-5 md:w-4 md:h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 safe-area-bottom space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10 text-base md:text-sm md:h-9"
        >
          <LogOut className="w-5 h-5 md:w-4 md:h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MatrizSidebar;

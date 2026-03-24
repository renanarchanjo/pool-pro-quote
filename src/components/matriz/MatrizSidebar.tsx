import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Store, CreditCard, LogOut, Handshake, Users, Settings } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import simulapoolIcon from "@/assets/simulapool-icon.png";

const MatrizSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile, isMobile, state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (url: string) => {
    if (url === "/matriz") return location.pathname === "/matriz";
    return location.pathname.startsWith(url);
  };

  const handleNav = (url: string) => {
    navigate(url);
    if (isMobile) setOpenMobile(false);
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 pt-12 md:pt-4 pb-3 flex items-center">
        <div className="flex items-center gap-3 px-3 w-full">
          <img src={simulapoolIcon} alt="SimulaPool" className="h-20 w-20 md:h-16 md:w-16 object-contain rounded-xl shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-primary leading-tight">Simula Pool</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Painel Matriz</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>GESTÃO</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => handleNav(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="cursor-pointer h-11 md:h-9 text-base md:text-sm"
                  >
                    <item.icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 safe-area-bottom space-y-2">
        <div className="flex items-center justify-between">
          {!collapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          <ThemeToggle />
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-11 md:h-9 text-destructive border-destructive/30 hover:bg-destructive/10 text-base md:text-sm"
        >
          <LogOut className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MatrizSidebar;

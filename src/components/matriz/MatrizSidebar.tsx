import { useNavigate, useLocation } from "react-router-dom";
import {
  TrendingUp, Users, Calculator, CreditCard, AlertTriangle,
  Store, Handshake, Tag, MapPin, FileBarChart, Filter, LogOut,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import simulapoolIcon from "@/assets/simulapool-icon.png";

const MatrizSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

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

  const gestaoItems = [
    { title: "Dashboard Financeiro", url: "/matriz", icon: TrendingUp },
    { title: "Lojistas Ativos", url: "/matriz/lojistas", icon: Users },
    { title: "Simulações", url: "/matriz/simulacoes", icon: Calculator },
    { title: "Pagamentos", url: "/matriz/pagamentos", icon: CreditCard },
    { title: "Inadimplência", url: "/matriz/inadimplencia", icon: AlertTriangle },
  ];

  const cadastroItems = [
    { title: "Lojas Cadastradas", url: "/matriz/lojas", icon: Store },
    { title: "Parceiros", url: "/matriz/parceiros", icon: Handshake },
    { title: "Planos e Preços", url: "/matriz/planos", icon: Tag },
  ];

  const analiseItems = [
    { title: "Mapa de Lojistas", url: "/matriz/mapa", icon: MapPin },
    { title: "Relatórios", url: "/matriz/relatorios", icon: FileBarChart },
    { title: "Leads", url: "/matriz/leads", icon: Filter },
  ];

  const renderGroup = (label: string, items: typeof gestaoItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 mt-4 mb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  onClick={() => handleNav(item.url)}
                  isActive={active}
                  tooltip={item.title}
                  className={`cursor-pointer h-9 text-[13px] rounded-lg transition-all duration-150 ${
                    active
                      ? "bg-background border border-border font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-accent font-normal border border-transparent"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="none" className="!w-[220px] !bg-sidebar !border-r !border-sidebar-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <img src={simulapoolIcon} alt="SimulaPool" className="h-8 w-8 object-contain rounded-lg shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">SimulaPool</span>
            <span className="text-xs text-muted-foreground">Painel Matriz</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {renderGroup("Gestão", gestaoItems)}
        {renderGroup("Cadastro", cadastroItems)}
        {renderGroup("Análise", analiseItems)}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border shrink-0 safe-area-bottom">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full text-[13px] text-muted-foreground hover:text-destructive px-2 py-2 rounded-lg transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MatrizSidebar;

import { useNavigate, useLocation } from "react-router-dom";
import {
  TrendingUp, Users, CreditCard, AlertTriangle,
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
import logoIcon from "@/assets/logo-icon.png";

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
    <SidebarGroup className="py-0">
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 px-3 pt-5 pb-1.5">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  onClick={() => handleNav(item.url)}
                  isActive={active}
                  tooltip={item.title}
                  className={`cursor-pointer h-8 text-[13px] rounded-lg transition-all duration-150 ${
                    active
                      ? "bg-primary/10 font-semibold text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground font-normal border border-transparent"
                  }`}
                >
                  <item.icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.8} />
                  <span className="truncate">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="offcanvas" className="!w-[230px] !h-screen !bg-sidebar !border-r !border-sidebar-border [&>div]:flex [&>div]:flex-col [&>div]:!h-screen">
      <SidebarHeader className="border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <img src={logoIcon} alt="SimulaPool" className="h-7 w-auto shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-bold text-foreground leading-tight tracking-[-0.01em]">SimulaPool</span>
            <span className="text-[11px] text-muted-foreground leading-tight">Painel Matriz</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto flex-1 min-h-0">
        {renderGroup("Gestão", gestaoItems)}
        {renderGroup("Cadastro", cadastroItems)}
        {renderGroup("Análise", analiseItems)}
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 p-3 border-t border-border safe-area-bottom">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full text-[13px] text-muted-foreground hover:text-destructive px-2 py-1.5 rounded-lg transition-all duration-150"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MatrizSidebar;

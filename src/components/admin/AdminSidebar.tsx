import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  LayoutDashboard, FilePlus, Tag, Box, Package, User, Users, LogOut, UsersRound, CreditCard, Receipt
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import simulapoolIcon from "@/assets/simulapool-icon.png";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useStoreData();
  const { setOpenMobile, isMobile, state } = useSidebar();
  const collapsed = state === "collapsed";

  const isOwner = role === "owner";

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
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

  const mainItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Gerar Proposta", url: "/admin/gerar-proposta", icon: FilePlus },
    { title: "Leads", url: "/admin/leads", icon: Users },
  ];

  const catalogItems = isOwner ? [
    { title: "Marca e Categoria", url: "/admin/marcas", icon: Tag },
    { title: "Modelos", url: "/admin/modelos", icon: Box },
    { title: "Opcionais", url: "/admin/opcionais", icon: Package },
  ] : [];

  const accountItems = [
    { title: "Meu Perfil", url: "/admin/perfil", icon: User },
    { title: "Faturas", url: "/admin/faturas", icon: Receipt },
    ...(isOwner ? [
      { title: "Equipe", url: "/admin/equipe", icon: UsersRound },
      { title: "Assinatura", url: "/admin/assinatura", icon: CreditCard },
    ] : []),
  ];

  const renderGroup = (label: string, items: typeof mainItems) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
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
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 pt-12 md:pt-4 pb-3 flex items-center">
        <div className="flex items-center gap-3 px-3 w-full">
          <img src={simulapoolIcon} alt="SimulaPool" className="h-20 w-20 md:h-16 md:w-16 object-contain rounded-xl shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-primary leading-tight">Simula Pool</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Painel do Lojista</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("PAINEL DO LOJISTA", mainItems)}
        {renderGroup("CADASTROS", catalogItems)}
        {renderGroup("CONTA", accountItems)}
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

export default AdminSidebar;

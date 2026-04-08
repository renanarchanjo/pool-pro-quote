import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, FilePlus, Tag, Box, Package, User, Users, LogOut, UsersRound, CreditCard, Receipt, TrendingUp, DollarSign, Handshake, FolderTree
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile } = useStoreData();
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

  const initials = (profile?.full_name || "L")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const mainItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Gerar Nova Proposta", url: "/admin/gerar-proposta", icon: FilePlus },
    { title: "Leads (Tráfego)", url: "/admin/leads", icon: Users },
  ];

  const catalogItems = isOwner ? [
    { title: "Marcas Parceiras", url: "/admin/parceiros", icon: Handshake },
    { title: "Marcas", url: "/admin/marcas", icon: Tag },
    { title: "Categorias de Marcas", url: "/admin/categorias", icon: FolderTree },
    { title: "Modelos e Opcionais", url: "/admin/modelos", icon: Box },
    { title: "Opcionais", url: "/admin/opcionais", icon: Package },
  ] : [];

  const accountItems = [
    { title: "Minha Conta", url: "/admin/perfil", icon: User },
    ...(!isOwner ? [
      { title: "Performance", url: "/admin/performance", icon: TrendingUp },
      { title: "Comissão", url: "/admin/comissao", icon: DollarSign },
    ] : [
      { title: "Minha Equipe", url: "/admin/equipe", icon: UsersRound },
      { title: "Faturas", url: "/admin/faturas", icon: Receipt },
      { title: "Assinatura", url: "/admin/assinatura", icon: CreditCard },
    ]),
  ];

  const renderGroup = (label: string, items: typeof mainItems) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && (
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] px-3 mt-4 mb-1">
            {label}
          </SidebarGroupLabel>
        )}
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
                        ? "bg-[#FFFFFF] border border-[#E5E7EB] font-semibold text-[#0D0D0D]"
                        : "text-[#6B7280] hover:bg-[#F1F3F5] font-normal border border-transparent"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#0EA5E9]" : "text-[#9CA3AF]"}`} strokeWidth={1.5} />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="!bg-[#F8F9FA] !border-r !border-[#E5E7EB]">
      <SidebarHeader className="border-b border-[#E5E7EB] p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E0F2FE] flex items-center justify-center shrink-0">
            <span className="text-[13px] font-semibold text-[#0369A1]">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-[#0D0D0D] truncate">{profile?.full_name || "Lojista"}</span>
              <span className="text-xs text-[#9CA3AF]">Painel do Lojista</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {renderGroup("Painel Comercial", mainItems)}
        {renderGroup("Cadastro", catalogItems)}
        {renderGroup("Conta", accountItems)}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-[#E5E7EB] shrink-0 safe-area-bottom">
        <div className="flex items-center justify-between mb-2">
          {!collapsed && <span className="text-xs text-[#9CA3AF]">Tema</span>}
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full text-[13px] text-[#6B7280] hover:text-[#DC2626] px-2 py-2 rounded-lg transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {!collapsed && <span>Sair</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;

import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FilePlus, Tag, Box, Package, User, Users, LogOut, UsersRound, CreditCard
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useStoreData();

  const isOwner = role === "owner";

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/");
  };

  const mainItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Gerar Proposta", url: "/admin/gerar-proposta", icon: FilePlus },
  ];

  const catalogItems = isOwner ? [
    { title: "Marca e Categoria", url: "/admin/marcas", icon: Tag },
    { title: "Modelos", url: "/admin/modelos", icon: Box },
    { title: "Opcionais", url: "/admin/opcionais", icon: Package },
  ] : [];

  const accountItems = [
    { title: "Meu Perfil", url: "/admin/perfil", icon: User },
    ...(isOwner ? [
      { title: "Equipe", url: "/admin/equipe", icon: UsersRound },
      { title: "Assinatura", url: "/admin/assinatura", icon: CreditCard },
    ] : []),
  ];


  const renderGroup = (label: string, items: typeof mainItems) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
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
    );
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex justify-center">
          <img src={logoHorizontal} alt="SIMULAPOOL" className="h-10 object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("PAINEL DO LOJISTA", mainItems)}
        {renderGroup("CADASTROS", catalogItems)}
        {renderGroup("CONTA", accountItems)}
        {renderGroup("ADMINISTRAÇÃO", adminItems)}
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

export default AdminSidebar;

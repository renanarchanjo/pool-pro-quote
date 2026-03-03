import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, FilePlus, FolderOpen, Layers, Package, Box, User, Users, LogOut 
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
import logoDark from "@/assets/simulapool-dark.png";

const storeItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Gerar Proposta", url: "/admin/gerar-proposta", icon: FilePlus },
  { title: "Propostas", url: "/admin/propostas", icon: FileText },
  { title: "Categorias", url: "/admin/categorias", icon: FolderOpen },
  { title: "Categorias de Opcionais", url: "/admin/grupos", icon: Layers },
  { title: "Opcionais", url: "/admin/opcionais", icon: Package },
  { title: "Modelos", url: "/admin/modelos", icon: Box },
  { title: "Meu Perfil", url: "/admin/perfil", icon: User },
];

const adminItems = [
  { title: "Lojistas", url: "/admin/lojistas", icon: Users },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/");
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex justify-center">
          <img src={logoDark} alt="SIMULAPOOL" className="h-10 object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>ÁREA DO LOJISTA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {storeItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>ADMINISTRAÇÃO</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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

export default AdminSidebar;

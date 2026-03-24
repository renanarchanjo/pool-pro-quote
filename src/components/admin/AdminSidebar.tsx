import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BadgePercent,
  TriangleAlert,
  Building2,
  Wallet,
  ReceiptText,
  UserCog,
  Shield,
  LogOut,
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
  const { profile } = useStoreData();
  const { setOpenMobile, isMobile, state } = useSidebar();
  const collapsed = state === "collapsed";

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

  const groups = [
    {
      label: "OPERAÇÕES",
      items: [
        { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
        { title: "Fluxo de Caixa", url: "/admin/fluxo", icon: ArrowLeftRight },
        { title: "Ofertas", url: "/admin/ofertas", icon: BadgePercent },
        { title: "Prejuízos", url: "/admin/prejuizos", icon: TriangleAlert },
      ],
    },
    {
      label: "EMPRESARIAL",
      items: [{ title: "Finanças Empresariais", url: "/admin/financeiro-empresarial", icon: Building2 }],
    },
    {
      label: "PESSOAL",
      items: [
        { title: "Finanças Pessoais", url: "/admin/financas", icon: Wallet },
        { title: "Contas a Pagar", url: "/admin/contas-a-pagar", icon: ReceiptText },
      ],
    },
    {
      label: "SISTEMA",
      items: [
        { title: "Conta", url: "/admin/perfil", icon: UserCog },
        { title: "Admin", url: "/admin/equipe", icon: Shield },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 pt-12 md:pt-4 pb-5 flex items-center">
        <div className="flex items-center gap-4 px-4 w-full">
          <div className="flex h-10 w-10 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <img src={simulapoolIcon} alt="ND Soluções Digitais" className="h-6 w-6 md:h-5 md:w-5 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] md:text-base font-bold text-foreground leading-tight">ND Soluções Digitais</span>
              <span className="truncate text-sm md:text-[15px] text-muted-foreground leading-tight">Gestão Financeira</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel className="px-2 text-xs tracking-[0.18em] text-muted-foreground/80">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNav(item.url)}
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="cursor-pointer h-11 md:h-9 rounded-2xl text-base md:text-sm font-normal px-4"
                    >
                      <item.icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 safe-area-bottom space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <ThemeToggle />
          </div>
        </div>
        {!collapsed && <p className="text-sm text-muted-foreground break-all">{profile?.full_name ? `${profile.full_name}` : ""}{profile?.full_name ? "" : ""}</p>}
        {!collapsed && (
          <p className="text-sm text-muted-foreground break-all -mt-3">
            {(supabase.auth.getUser && undefined) as any}
          </p>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start h-11 md:h-9 text-base md:text-sm text-foreground hover:bg-accent"
        >
          <LogOut className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;

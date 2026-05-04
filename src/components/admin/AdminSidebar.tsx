import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { LogOut, ChevronDown } from "lucide-react";
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
import { getAdminNavGroups, type SidebarNavGroup, type SidebarNavItem } from "./adminNavItems";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile } = useStoreData();
  const { setOpenMobile, isMobile } = useSidebar();

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
    navigate("/login", { replace: true });
  };

  const initials = (profile?.full_name || "L")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const groups = getAdminNavGroups(isOwner);
  const catalogGroup = groups.find((g) => g.collapsible);
  const catalogActive = catalogGroup?.items.some((i) => isActive(i.url));
  const [catalogOpen, setCatalogOpen] = useState<boolean>(!!catalogActive);

  const renderItem = (item: SidebarNavItem, indent = false) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          onClick={() => handleNav(item.url)}
          isActive={active}
          tooltip={item.title}
          className={`cursor-pointer h-9 text-[13px] rounded-lg transition-all duration-150 ${indent ? "pl-7" : ""} ${
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
  };

  const renderGroup = (group: SidebarNavGroup) => {
    if (group.items.length === 0) return null;

    if (group.collapsible) {
      const ParentIcon = group.parentIcon;
      const anyActive = group.items.some((i) => isActive(i.url));
      return (
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 mt-4 mb-1">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setCatalogOpen((v) => !v)}
                  isActive={anyActive}
                  tooltip={group.label}
                  className={`cursor-pointer h-9 text-[13px] rounded-lg transition-all duration-150 ${
                    anyActive
                      ? "bg-background border border-border font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-accent font-normal border border-transparent"
                  }`}
                >
                  {ParentIcon && (
                    <ParentIcon className={`h-4 w-4 shrink-0 ${anyActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  )}
                  <span className="flex-1">{group.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${catalogOpen ? "" : "-rotate-90"}`}
                    strokeWidth={2}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              {catalogOpen && group.items.map((item) => renderItem(item, true))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 mt-4 mb-1">
          {group.label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => renderItem(item))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="none" className="!w-[220px] !bg-sidebar !border-r !border-sidebar-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-semibold text-primary">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">{profile?.full_name || "Lojista"}</span>
            <span className="text-xs text-muted-foreground">Painel do Lojista</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((g) => {
          if (isMobile && g.hideOnMobile) return null;
          return <div key={g.label}>{renderGroup(g)}</div>;
        })}
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

export default AdminSidebar;

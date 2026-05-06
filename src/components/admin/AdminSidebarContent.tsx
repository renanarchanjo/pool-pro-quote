import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import { getAdminNavGroups, type SidebarNavGroup, type SidebarNavItem } from "./adminNavItems";
import { prefetchAdminRoute } from "@/lib/adminChunkPrefetch";

interface AdminSidebarContentProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

const AdminSidebarContent = ({ onNavigate, isMobile = false }: AdminSidebarContentProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile } = useStoreData();

  const isOwner = role === "owner";

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  const handleNav = (url: string) => {
    navigate(url);
    onNavigate?.();
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

  // Auto-open Meus Produtos if any of its routes is active
  const catalogGroup = groups.find((g) => g.label === "Meus Produtos");
  const catalogActive = catalogGroup?.items.some((i) => isActive(i.url));
  const [catalogOpen, setCatalogOpen] = useState<boolean>(!!catalogActive);

  const renderItemButton = (item: SidebarNavItem, indent = false) => {
    const active = isActive(item.url);
    return (
      <button
        key={item.title}
        onClick={() => handleNav(item.url)}
        onPointerEnter={() => prefetchAdminRoute(item.url)}
        onFocus={() => prefetchAdminRoute(item.url)}
        className={`flex items-center justify-end gap-2.5 w-full h-9 text-[13px] rounded-lg ${indent ? "pl-6 pr-2.5" : "px-2.5"} transition-all duration-150 ${
          active
            ? "bg-background border border-border font-semibold text-foreground"
            : "text-muted-foreground hover:bg-accent font-normal border border-transparent"
        }`}
      >
        <span className={`truncate ${item.title === "Marcas Parceiras" ? "font-bold text-primary" : ""}`}>{item.title}</span>
        <item.icon className={`h-4 w-4 shrink-0 ${item.title === "Marcas Parceiras" ? "text-primary" : active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
      </button>
    );
  };

  const renderGroup = (group: SidebarNavGroup) => {
    if (group.items.length === 0) return null;

    if (group.collapsible) {
      const ParentIcon = group.parentIcon;
      const anyActive = group.items.some((i) => isActive(i.url));
      return (
        <div className="mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 mt-4 mb-1.5 text-right">
            {group.label}
          </p>
          <div className="space-y-0.5 px-2">
            <button
              onClick={() => setCatalogOpen((v) => !v)}
              className={`flex items-center justify-end gap-2.5 w-full h-9 text-[13px] rounded-lg px-2.5 transition-all duration-150 ${
                anyActive
                  ? "bg-background border border-border font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-accent font-normal border border-transparent"
              }`}
              aria-expanded={catalogOpen}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${catalogOpen ? "" : "-rotate-90"}`}
                strokeWidth={2}
              />
              <span className="flex-1 truncate text-right">{group.label}</span>
              {ParentIcon && (
                <ParentIcon className={`h-4 w-4 shrink-0 ${anyActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              )}
            </button>
            {catalogOpen && (
              <div className="space-y-0.5 pt-0.5">
                {group.items.map((item) => renderItemButton(item, true))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 mt-4 mb-1.5 text-right">
          {group.label}
        </p>
        <div className="space-y-0.5 px-2">
          {group.items.map((item) => renderItemButton(item))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header — user info only */}
      <div className="border-b border-border px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3 justify-end">
          <div className="flex flex-col min-w-0 items-end">
            <span className="text-[13px] font-semibold text-foreground truncate">{profile?.full_name || "Lojista"}</span>
            <span className="text-xs text-muted-foreground">Painel do Lojista</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-semibold text-primary">{initials}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {groups.map((g) => {
          if (isMobile && g.hideOnMobile) return null;
          return <div key={g.label}>{renderGroup(g)}</div>;
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-end gap-2 w-full text-[13px] text-muted-foreground hover:text-destructive px-2 py-2 rounded-lg transition-all duration-150"
        >
          <span>Sair</span>
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default AdminSidebarContent;

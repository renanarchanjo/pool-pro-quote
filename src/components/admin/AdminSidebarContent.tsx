import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, FilePlus, Tag, Box, Package, User, Users, LogOut, UsersRound, CreditCard, Receipt, TrendingUp, DollarSign, Handshake, FolderTree
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

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
      <div className="mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 mt-4 mb-1.5 text-right">
          {label}
        </p>
        <div className="space-y-0.5 px-2">
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <button
                key={item.title}
                onClick={() => handleNav(item.url)}
                className={`flex items-center justify-end gap-2.5 w-full h-9 text-[13px] rounded-lg px-2.5 transition-all duration-150 ${
                  active
                    ? "bg-background border border-border font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent font-normal border border-transparent"
                }`}
              >
                <span className="truncate">{item.title}</span>
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-semibold text-primary">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">{profile?.full_name || "Lojista"}</span>
            <span className="text-xs text-muted-foreground">Painel do Lojista</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {renderGroup("Painel Comercial", mainItems)}
        {!isMobile && renderGroup("Cadastro", catalogItems)}
        {renderGroup("Conta", accountItems)}
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

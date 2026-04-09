import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutGrid, CircleAlert,
  Building2, Users, Wallet, MapPinned, Funnel, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoIcon from "@/assets/logo-icon-v2.png";

interface MatrizSidebarContentProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

const MatrizSidebarContent = ({ onNavigate, isMobile = false }: MatrizSidebarContentProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/matriz") return location.pathname === "/matriz";
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

  const mainItems = [
    { title: "Dashboard", url: "/matriz", icon: TrendingUp },
    { title: "Lojas Ativas", url: "/matriz/lojistas", icon: Store },
    { title: "Parceiros", url: "/matriz/parceiros", icon: Handshake },
    { title: "Mapa de Lojistas", url: "/matriz/mapa", icon: MapPin },
  ];

  const operacaoItems = [
    { title: "Leads", url: "/matriz/leads", icon: Filter },
    { title: "Planos e Preços", url: "/matriz/planos", icon: Tag },
    { title: "Inadimplência", url: "/matriz/inadimplencia", icon: AlertTriangle },
    
  ];

  const renderGroup = (label: string, items: typeof mainItems) => (
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 shrink-0">
        <div className="flex items-center gap-2 justify-end">
          <div className="flex flex-col min-w-0 items-end">
            <span className="text-[13px] font-semibold text-foreground truncate">SimulaPool</span>
            <span className="text-xs text-muted-foreground">Painel Matriz</span>
          </div>
          <img src={logoIcon} alt="SimulaPool" className="h-7 w-auto shrink-0" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {renderGroup("Principal", mainItems)}
        {renderGroup("Operação", operacaoItems)}
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

export default MatrizSidebarContent;

import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, FilePlus, Users, Menu as MenuIcon } from "lucide-react";
import { useState, useEffect } from "react";
import AdminSidebarContent from "./AdminSidebarContent";
import FloatingPanel from "./FloatingPanel";

const NAV_ITEMS = [
  { label: "Dash", icon: LayoutDashboard, url: "/admin" },
  { label: "Nova", icon: FilePlus, url: "/admin/gerar-proposta" },
  { label: "Leads", icon: Users, url: "/admin/leads" },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  // Close panel on route change
  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around"
        style={{
          height: `calc(var(--bottom-nav-height) + var(--safe-area-bottom))`,
          paddingBottom: 'var(--safe-area-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors duration-100 active:scale-95"
              style={{ height: 'var(--bottom-nav-height)' }}
              data-compact
            >
              <item.icon
                className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.2 : 1.5}
              />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setPanelOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors duration-100 active:scale-95"
          style={{ height: 'var(--bottom-nav-height)' }}
          data-compact
        >
          <MenuIcon
            className={`w-5 h-5 transition-colors ${panelOpen ? "text-primary" : "text-muted-foreground"}`}
            strokeWidth={panelOpen ? 2.2 : 1.5}
          />
          <span className={`text-[10px] font-medium transition-colors ${panelOpen ? "text-primary" : "text-muted-foreground"}`}>
            Menu
          </span>
        </button>
      </nav>

      {/* Floating Right Panel */}
      <FloatingPanel open={panelOpen} onClose={() => setPanelOpen(false)}>
        <AdminSidebarContent onNavigate={() => setPanelOpen(false)} isMobile />
      </FloatingPanel>
    </>
  );
};

export default MobileBottomNav;

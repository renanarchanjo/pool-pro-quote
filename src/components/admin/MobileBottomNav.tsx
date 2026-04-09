import { useNavigate, useLocation } from "react-router-dom";
import { Home, Plus, Send, AlignRight } from "lucide-react";
import { useState, useEffect } from "react";
import AdminSidebarContent from "./AdminSidebarContent";
import FloatingPanel from "./FloatingPanel";

const NAV_ITEMS = [
  { icon: Home, url: "/admin" },
  { icon: Plus, url: "/admin/gerar-proposta" },
  { icon: Send, url: "/admin/leads" },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav
        className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 flex items-center justify-around"
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
              className="flex items-center justify-center flex-1 transition-all duration-150 active:scale-90"
              style={{ height: 'var(--bottom-nav-height)' }}
              data-compact
            >
              <div className={`p-2 rounded-xl transition-all duration-150 ${active ? "bg-primary/10" : ""}`}>
                <item.icon
                  className={`w-[22px] h-[22px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.2 : 1.6}
                />
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center justify-center flex-1 transition-all duration-150 active:scale-90"
          style={{ height: 'var(--bottom-nav-height)' }}
          data-compact
        >
          <div className={`p-2 rounded-xl transition-all duration-150 ${panelOpen ? "bg-primary/10" : ""}`}>
            <AlignRight
              className={`w-[22px] h-[22px] transition-colors ${panelOpen ? "text-primary" : "text-muted-foreground"}`}
              strokeWidth={panelOpen ? 2.2 : 1.6}
            />
          </div>
        </button>
      </nav>

      <FloatingPanel open={panelOpen} onClose={() => setPanelOpen(false)}>
        <AdminSidebarContent onNavigate={() => setPanelOpen(false)} isMobile />
      </FloatingPanel>
    </>
  );
};

export default MobileBottomNav;

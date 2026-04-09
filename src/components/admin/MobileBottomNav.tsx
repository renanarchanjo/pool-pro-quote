import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, FilePlus, Users, Menu as MenuIcon } from "lucide-react";
import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Dash", icon: LayoutDashboard, url: "/admin" },
  { label: "Nova", icon: FilePlus, url: "/admin/gerar-proposta" },
  { label: "Leads", icon: Users, url: "/admin/leads" },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around"
        style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-14 transition-colors duration-150"
            >
              <item.icon
                className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={active ? 2 : 1.5}
              />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-14 transition-colors duration-150"
        >
          <MenuIcon
            className={`w-5 h-5 ${sheetOpen ? "text-primary" : "text-muted-foreground"}`}
            strokeWidth={sheetOpen ? 2 : 1.5}
          />
          <span className={`text-[10px] font-medium ${sheetOpen ? "text-primary" : "text-muted-foreground"}`}>
            Menu
          </span>
        </button>
      </nav>

      {/* Right-side Sheet (banco digital style) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[80%] max-w-[300px] p-0 bg-background">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarProvider>
            <div className="w-full h-full overflow-y-auto">
              <AdminSidebar />
            </div>
          </SidebarProvider>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileBottomNav;

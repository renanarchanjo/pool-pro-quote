import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, FilePlus, Users, Menu as MenuIcon, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "./AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, url: "/admin" },
  { label: "Nova", icon: FilePlus, url: "/admin/gerar-proposta" },
  { label: "Leads", icon: Users, url: "/admin/leads" },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(url);
  };

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#E5E7EB] h-14 flex items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] transition-all duration-150"
            >
              <item.icon
                className={`w-5 h-5 ${active ? "text-[#0EA5E9]" : "text-[#9CA3AF]"}`}
                strokeWidth={1.5}
              />
              <span className={`text-[10px] font-medium ${active ? "text-[#0EA5E9]" : "text-[#9CA3AF]"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] transition-all duration-150"
        >
          <MenuIcon className={`w-5 h-5 ${drawerOpen ? "text-[#0EA5E9]" : "text-[#9CA3AF]"}`} strokeWidth={1.5} />
          <span className={`text-[10px] font-medium ${drawerOpen ? "text-[#0EA5E9]" : "text-[#9CA3AF]"}`}>
            Menu
          </span>
        </button>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/40 transition-opacity duration-150"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 z-[70] h-full w-[80%] max-w-[300px] bg-[#F8F9FA] border-r border-[#E5E7EB] transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-end p-3">
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F1F3F5] transition-all duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarProvider>
          <div className="w-full">
            <AdminSidebar />
          </div>
        </SidebarProvider>
      </div>
    </>
  );
};

export default MobileBottomNav;

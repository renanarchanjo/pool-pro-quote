import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Bell } from "lucide-react";

const PendingLeadsAlert = () => {
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const STORAGE_KEY = "pendingLeadsAlertShown";
    const STORAGE_DATE_KEY = "pendingLeadsAlertDate";

    // Only show once per day
    const lastShown = localStorage.getItem(STORAGE_DATE_KEY);
    const today = new Date().toDateString();
    if (lastShown === today) return;

    const checkPendingLeads = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.store_id) return;

      const { count } = await (supabase as any)
        .from("lead_distributions")
        .select("id", { count: "exact" })
        .eq("store_id", profile.store_id)
        .eq("status", "pending");

      if (count && count > 0) {
        setPendingCount(count);
        setOpen(true);
        localStorage.setItem(STORAGE_DATE_KEY, today);
      }
    };

    const timer = setTimeout(checkPendingLeads, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToLeads = () => {
    setOpen(false);
    navigate("/admin/leads");
  };

  if (pendingCount === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-destructive flex items-center justify-center">
              <span className="text-xs font-bold text-destructive-foreground">{pendingCount}</span>
            </div>
          </div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-xl">
              {pendingCount === 1 ? "Novo lead disponível!" : `${pendingCount} novos leads disponíveis!`}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {pendingCount === 1
                ? "Você recebeu um novo lead. Aceite para ver os dados do cliente."
                : `Você recebeu ${pendingCount} novos leads. Aceite para ver os dados dos clientes.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
            <Bell className="w-4 h-4 text-primary shrink-0" />
            <span>Os dados ficam bloqueados até você aceitar</span>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Depois
            </Button>
            <Button onClick={handleGoToLeads} className="flex-1 gap-2">
              Ver Leads <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PendingLeadsAlert;

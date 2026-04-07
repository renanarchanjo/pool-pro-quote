import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Bell } from "lucide-react";

const PendingLeadsAlert = () => {
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [lastCheckedCount, setLastCheckedCount] = useState(0);
  const navigate = useNavigate();

  const checkPendingLeads = useCallback(async (showOnlyIfNew = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let currentStoreId = storeId;
    if (!currentStoreId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", session.user.id)
        .single();
      if (!profile?.store_id) return;
      currentStoreId = profile.store_id;
      setStoreId(currentStoreId);
    }

    const { count } = await (supabase as any)
      .from("lead_distributions")
      .select("id", { count: "exact" })
      .eq("store_id", currentStoreId)
      .eq("status", "pending");

    const newCount = count || 0;
    if (newCount > 0) {
      if (!showOnlyIfNew || newCount > lastCheckedCount) {
        setPendingCount(newCount);
        setOpen(true);
      }
    }
    setLastCheckedCount(newCount);
  }, [storeId, lastCheckedCount]);

  // Initial check on mount
  useEffect(() => {
    const timer = setTimeout(() => checkPendingLeads(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Polling: check for new leads periodically
  useEffect(() => {
    const interval = setInterval(() => checkPendingLeads(true), 30000);
    return () => clearInterval(interval);
  }, [checkPendingLeads]);

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

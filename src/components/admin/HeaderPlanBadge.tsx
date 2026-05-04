import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Infinity as InfinityIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  storeId: string;
}

const startOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

const HeaderPlanBadge = ({ storeId }: Props) => {
  const navigate = useNavigate();
  const [planName, setPlanName] = useState<string>("");
  const [max, setMax] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: store } = await supabase
          .from("stores")
          .select("plan_id")
          .eq("id", storeId)
          .maybeSingle();

        let name = "Plano";
        let m = 0;
        if (store?.plan_id) {
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("name, max_proposals_per_month")
            .eq("id", store.plan_id)
            .maybeSingle();
          if (planData) {
            name = planData.name;
            m = planData.max_proposals_per_month || 0;
          }
        }

        const { count } = await supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId)
          .gte("created_at", startOfMonthIso());

        if (cancelled) return;
        setPlanName(name);
        setMax(m);
        setUsed(count || 0);
        setReady(true);
      } catch (e) {
        console.error("header plan badge error", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (!ready) return null;

  const unlimited = max === 0;
  const pct = unlimited ? 0 : Math.min(Math.round((used / max) * 100), 100);
  const critical = !unlimited && pct > 95;
  const warning = !unlimited && pct > 80 && !critical;

  const colorCls = critical
    ? "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5"
    : warning
    ? "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
    : "text-foreground border-border bg-background hover:border-primary/30";

  return (
    <button
      onClick={() => navigate("/admin/assinatura")}
      title={unlimited ? `${planName} • Ilimitado` : `${planName} • ${used}/${max} propostas (${pct}%)`}
      className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${colorCls}`}
    >
      <Crown className="w-3 h-3 text-primary" strokeWidth={2.2} />
      <span className="truncate max-w-[80px]">{planName}</span>
      <span className="text-muted-foreground/60">·</span>
      {unlimited ? (
        <InfinityIcon className="w-3 h-3" />
      ) : (
        <span className="tabular-nums">
          {used}/{max}
          <span className="text-muted-foreground ml-1">({pct}%)</span>
        </span>
      )}
    </button>
  );
};

export default memo(HeaderPlanBadge);

import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, AlertTriangle, Infinity as InfinityIcon, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  storeId: string;
}

interface PlanInfo {
  name: string;
  max: number; // 0 = ilimitado
}

const startOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

const DashboardPlanUsage = ({ storeId }: Props) => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: store } = await supabase
          .from("stores")
          .select("plan_id")
          .eq("id", storeId)
          .maybeSingle();

        let planInfo: PlanInfo = { name: "Plano atual", max: 0 };
        if (store?.plan_id) {
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("name, max_proposals_per_month")
            .eq("id", store.plan_id)
            .maybeSingle();
          if (planData) {
            planInfo = {
              name: planData.name,
              max: planData.max_proposals_per_month || 0,
            };
          }
        }

        const { count } = await supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId)
          .gte("created_at", startOfMonthIso());

        if (cancelled) return;
        setPlan(planInfo);
        setUsed(count || 0);
      } catch (e) {
        console.error("plan usage error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (loading || !plan) return null;

  const unlimited = plan.max === 0;
  const pct = unlimited ? 0 : Math.min((used / plan.max) * 100, 100);
  const critical = pct > 95;
  const warning = pct > 80 && !critical;

  const barColor = critical
    ? "bg-red-500"
    : warning
    ? "bg-amber-500"
    : "bg-primary";

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Plano Atual
            </p>
            <p className="text-[14px] font-bold text-foreground truncate">{plan.name}</p>
          </div>
        </div>

        {unlimited ? (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
            <InfinityIcon className="w-4 h-4" />
            Propostas ilimitadas
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-right">
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{used}</span>
                <span className="text-muted-foreground"> de {plan.max} propostas este mês</span>
              </p>
            </div>
            {warning && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" />
                Atenção
              </span>
            )}
            {critical && (
              <button
                onClick={() => navigate("/admin/assinatura")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors"
              >
                Fazer upgrade
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {!unlimited && (
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(pct, used > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default memo(DashboardPlanUsage);

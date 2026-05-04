import { memo } from "react";
import { FileText, Send, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import { Proposal, ProposalStatus, formatCurrency } from "./types";

interface Props {
  proposals: Proposal[];
}

const STATUS_META: Record<ProposalStatus, { Icon: any; bg: string; color: string; label: (p: Proposal) => string; verb: string }> = {
  nova: {
    Icon: FileText,
    bg: "bg-sky-500/10",
    color: "text-sky-600 dark:text-sky-400",
    verb: "Nova proposta",
    label: (p) => `${p.customer_name} · ${p.customer_city || "—"}`,
  },
  enviada: {
    Icon: Send,
    bg: "bg-violet-500/10",
    color: "text-violet-600 dark:text-violet-400",
    verb: "Proposta enviada",
    label: (p) => `${p.customer_name} · ${formatCurrency(p.total_price)}`,
  },
  em_negociacao: {
    Icon: MessageCircle,
    bg: "bg-amber-500/10",
    color: "text-amber-600 dark:text-amber-400",
    verb: "Em negociação",
    label: (p) => p.customer_name,
  },
  fechada: {
    Icon: CheckCircle,
    bg: "bg-emerald-500/10",
    color: "text-emerald-600 dark:text-emerald-400",
    verb: "Proposta fechada",
    label: (p) => `${p.customer_name} · ${formatCurrency(p.total_price)}`,
  },
  perdida: {
    Icon: XCircle,
    bg: "bg-red-500/10",
    color: "text-red-600 dark:text-red-400",
    verb: "Proposta perdida",
    label: (p) => p.customer_name,
  },
};

const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `há ${weeks}sem`;
  const months = Math.floor(days / 30);
  return `há ${months}mês`;
};

const DashboardActivity = ({ proposals }: Props) => {
  const items = [...proposals]
    .sort((a: any, b: any) => {
      const ad = new Date(a.updated_at || a.created_at).getTime();
      const bd = new Date(b.updated_at || b.created_at).getTime();
      return bd - ad;
    })
    .slice(0, 8);

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Atividade Recente
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          AO VIVO
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-[12px] text-muted-foreground">Nenhuma atividade recente</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] -mx-1 px-1">
          {items.map((p: any) => {
            const meta = STATUS_META[p.status as ProposalStatus] || STATUS_META.nova;
            const Icon = meta.Icon;
            return (
              <div
                key={p.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${meta.color}`} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground">{meta.verb}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{meta.label(p)}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {relativeTime(p.updated_at || p.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(DashboardActivity);

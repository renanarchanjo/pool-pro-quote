import { Badge } from "@/components/ui/badge";
import { Clock, Copy, Flame, Phone } from "lucide-react";
import { toast } from "sonner";
import { Proposal, daysSince, formatCurrency, STATUS_CONFIG, getPriority, PRIORITY_CONFIG } from "./types";

interface Props {
  proposals: Proposal[];
  onSelectProposal: (p: Proposal) => void;
}

const DashboardAlerts = ({ proposals, onSelectProposal }: Props) => {
  const activeProposals = proposals.filter(
    (p) => p.status !== "fechada" && p.status !== "perdida"
  );

  const stale = activeProposals
    .filter((p) => daysSince(p.created_at) > 3)
    .sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))
    .slice(0, 5);

  const inNegotiation = activeProposals
    .filter((p) => p.status === "em_negociacao")
    .sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))
    .slice(0, 5);

  const handleCopyPhone = (e: React.MouseEvent, p: Proposal) => {
    e.stopPropagation();
    const phone = p.customer_whatsapp.replace(/\D/g, "");
    navigator.clipboard.writeText(phone);
    toast.success("Número copiado!");
  };

  const handleCall = (e: React.MouseEvent, p: Proposal) => {
    e.stopPropagation();
    const phone = p.customer_whatsapp.replace(/\D/g, "");
    window.open(`tel:+55${phone}`, "_self");
  };

  const renderItem = (p: Proposal, renderValue: (p: Proposal) => string) => {
    const days = daysSince(p.created_at);
    const priority = getPriority(p);
    const priorityConf = PRIORITY_CONFIG[priority];
    const statusConf = STATUS_CONFIG[p.status];

    return (
      <button
        key={p.id}
        onClick={() => onSelectProposal(p)}
        className="w-full text-left p-2 rounded-lg hover:bg-[#F8F9FA] transition-all duration-150 border border-transparent hover:border-[#E5E7EB] group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityConf.dot}`} />
              <span className="text-xs font-semibold text-[#0D0D0D] truncate max-w-[140px]">{p.customer_name}</span>
            </div>
            <p className="text-[10px] text-[#9CA3AF]">
              {p.pool_models?.name || "Sem modelo"} · {p.customer_city}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold text-[#0D0D0D]">{renderValue(p)}</p>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 mt-0.5 ${statusConf.className}`}>
              {statusConf.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[#9CA3AF]">
            {days === 0 ? "Hoje" : days === 1 ? "Ontem" : `${days} dias atrás`}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <span
              role="button"
              onClick={(e) => handleCopyPhone(e, p)}
              className="p-1 rounded-md hover:bg-[#F1F3F5] text-[#9CA3AF] transition-all duration-150 cursor-pointer"
              title="Copiar número"
            >
              <Copy className="w-3.5 h-3.5" />
            </span>
            <span
              role="button"
              onClick={(e) => handleCall(e, p)}
              className="p-1 rounded-md hover:bg-[#E0F2FE] text-[#0EA5E9] transition-all duration-150 cursor-pointer"
              title="Ligar"
            >
              <Phone className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </button>
    );
  };

  const sections = [
    {
      title: "Sem Atualização",
      subtitle: `${stale.length} sem contato há +3 dias`,
      icon: Clock,
      iconColor: "text-[#D97706]",
      iconBg: "bg-[#FFFBEB]",
      items: stale,
      empty: "Tudo em dia 🎉",
      emptyDesc: "Nenhuma proposta parada.",
      renderValue: (p: Proposal) => `${daysSince(p.created_at)}d parada`,
    },
    {
      title: "Aguardando Fechamento",
      subtitle: `${inNegotiation.length} em negociação`,
      icon: Flame,
      iconColor: "text-[#D97706]",
      iconBg: "bg-[#FFFBEB]",
      items: inNegotiation,
      empty: "Nenhuma em negociação",
      emptyDesc: "Não há propostas neste estágio.",
      renderValue: (p: Proposal) => formatCurrency(p.total_price),
    },
  ];

  if (stale.length === 0 && inNegotiation.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Alertas e Oportunidades
      </p>
      <div className="grid grid-cols-1 gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className={`p-1.5 rounded-lg ${section.iconBg}`}>
                  <Icon className={`w-4 h-4 ${section.iconColor}`} />
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0D0D0D]">{section.title}</h4>
                  <p className="text-[10px] text-[#9CA3AF]">{section.subtitle}</p>
                </div>
              </div>
              {section.items.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-[#0D0D0D]">{section.empty}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">{section.emptyDesc}</p>
                </div>
              ) : (
                <div className="space-y-1 mt-3">
                  {section.items.map((p) => renderItem(p, section.renderValue))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardAlerts;

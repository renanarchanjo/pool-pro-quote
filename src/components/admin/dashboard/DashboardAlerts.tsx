import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, Flame, MessageCircle, Phone } from "lucide-react";
import { Proposal, daysSince, formatCurrency, STATUS_PROBABILITY, STATUS_CONFIG, getPriority, PRIORITY_CONFIG } from "./types";

interface Props {
  proposals: Proposal[];
  onSelectProposal: (p: Proposal) => void;
}

const DashboardAlerts = ({ proposals, onSelectProposal }: Props) => {
  const activeProposals = proposals.filter(
    (p) => p.status !== "fechada" && p.status !== "perdida"
  );

  // Stale proposals (>5 days without change) - lowered threshold for earlier action
  const stale = activeProposals
    .filter((p) => daysSince(p.created_at) > 5)
    .sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))
    .slice(0, 5);

  // High-value open proposals (dynamic threshold: top 20% or > 30k)
  const sortedByValue = [...activeProposals].sort((a, b) => b.total_price - a.total_price);
  const dynamicThreshold = sortedByValue.length >= 5
    ? sortedByValue[Math.floor(sortedByValue.length * 0.2)]?.total_price || 30000
    : 30000;
  const highValue = sortedByValue
    .filter((p) => p.total_price >= dynamicThreshold)
    .slice(0, 5);

  // Best closing opportunities (highest expected value)
  const bestOpportunities = activeProposals
    .map((p) => ({
      ...p,
      expectedValue: p.total_price * STATUS_PROBABILITY[p.status],
    }))
    .sort((a, b) => b.expectedValue - a.expectedValue)
    .slice(0, 5);

  const handleWhatsApp = (e: React.MouseEvent, p: Proposal) => {
    e.stopPropagation();
    const phone = p.customer_whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${p.customer_name.split(" ")[0]}! Tudo bem? Vi que você demonstrou interesse em uma piscina. Gostaria de tirar alguma dúvida?`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const handleCall = (e: React.MouseEvent, p: Proposal) => {
    e.stopPropagation();
    const phone = p.customer_whatsapp.replace(/\D/g, "");
    window.open(`tel:+55${phone}`, "_self");
  };

  const renderItem = (p: Proposal & { expectedValue?: number }, section: typeof sections[0]) => {
    const days = daysSince(p.created_at);
    const priority = getPriority(p);
    const priorityConf = PRIORITY_CONFIG[priority];
    const statusConf = STATUS_CONFIG[p.status];

    return (
      <button
        key={p.id}
        onClick={() => onSelectProposal(p)}
        className="w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50 group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityConf.dot}`} />
              <span className="text-sm font-semibold truncate max-w-[140px]">{p.customer_name}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {p.pool_models?.name || "Sem modelo"} · {p.customer_city}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold">{section.renderValue(p)}</p>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 mt-0.5 ${statusConf.className}`}>
              {statusConf.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {days === 0 ? "Hoje" : days === 1 ? "Ontem" : `${days} dias atrás`}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span
              role="button"
              onClick={(e) => handleWhatsApp(e, p)}
              className="p-1 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer"
              title="WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </span>
            <span
              role="button"
              onClick={(e) => handleCall(e, p)}
              className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors cursor-pointer"
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
      title: "Precisam de Ação",
      subtitle: `${stale.length} sem contato há +5 dias`,
      icon: Clock,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      items: stale,
      empty: "Nenhuma proposta parada 🎉",
      emptyDesc: "Todas as propostas estão sendo acompanhadas.",
      renderValue: (p: Proposal) => `${daysSince(p.created_at)}d parada`,
    },
    {
      title: "Prioridade de Fecho",
      subtitle: `${formatCurrency(bestOpportunities.reduce((s, p: any) => s + (p.expectedValue || 0), 0))} receita prevista`,
      icon: Flame,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      items: bestOpportunities,
      empty: "Nenhuma oportunidade",
      emptyDesc: "Propostas com maior probabilidade de fechamento aparecerão aqui.",
      renderValue: (p: any) => `${formatCurrency(p.expectedValue)} prev.`,
    },
  ];

  if (stale.length === 0 && bestOpportunities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alertas e Oportunidades
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className={`p-1.5 rounded-lg ${section.iconBg}`}>
                    <Icon className={`w-4 h-4 ${section.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">{section.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{section.subtitle}</p>
                  </div>
                </div>
                {section.items.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm">{section.empty}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{section.emptyDesc}</p>
                  </div>
                ) : (
                  <div className="space-y-1 mt-3">
                    {section.items.map((p) => renderItem(p as any, section))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardAlerts;

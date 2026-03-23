import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, DollarSign, Flame } from "lucide-react";
import { Proposal, daysSince, formatCurrency, STATUS_PROBABILITY } from "./types";

interface Props {
  proposals: Proposal[];
  onSelectProposal: (p: Proposal) => void;
}

const DashboardAlerts = ({ proposals, onSelectProposal }: Props) => {
  const activeProposals = proposals.filter(
    (p) => p.status !== "fechada" && p.status !== "perdida"
  );

  // Stale proposals (>7 days without change)
  const stale = activeProposals
    .filter((p) => daysSince(p.created_at) > 7)
    .sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))
    .slice(0, 5);

  // High-value open proposals
  const highValue = activeProposals
    .filter((p) => p.total_price > 30000)
    .sort((a, b) => b.total_price - a.total_price)
    .slice(0, 5);

  // Best closing opportunities (highest expected value)
  const bestOpportunities = activeProposals
    .map((p) => ({
      ...p,
      expectedValue: p.total_price * STATUS_PROBABILITY[p.status],
    }))
    .sort((a, b) => b.expectedValue - a.expectedValue)
    .slice(0, 5);

  const sections = [
    {
      title: "Propostas Paradas",
      icon: Clock,
      iconColor: "text-amber-500",
      items: stale,
      empty: "Nenhuma proposta parada",
      renderDetail: (p: Proposal) => `${daysSince(p.created_at)} dias sem atividade`,
    },
    {
      title: "Alto Valor em Aberto",
      icon: DollarSign,
      iconColor: "text-emerald-500",
      items: highValue,
      empty: "Nenhuma proposta de alto valor",
      renderDetail: (p: Proposal) => formatCurrency(p.total_price),
    },
    {
      title: "Maior Chance de Fechar",
      icon: Flame,
      iconColor: "text-red-500",
      items: bestOpportunities,
      empty: "Nenhuma oportunidade identificada",
      renderDetail: (p: any) => `${formatCurrency(p.expectedValue)} previsto`,
    },
  ];

  if (stale.length === 0 && highValue.length === 0 && bestOpportunities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alertas e Oportunidades
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${section.iconColor}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">{section.title}</h4>
                </div>
                {section.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{section.empty}</p>
                ) : (
                  <div className="space-y-2">
                    {section.items.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectProposal(p)}
                        className="w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{p.customer_name}</span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {section.renderDetail(p)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.pool_models?.name || "N/A"} · {p.customer_city}
                        </p>
                      </button>
                    ))}
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

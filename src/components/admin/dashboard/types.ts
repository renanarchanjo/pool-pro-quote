export type ProposalStatus = "nova" | "enviada" | "em_negociacao" | "fechada" | "perdida";

export interface Proposal {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  selected_optionals: any;
  store_id: string | null;
  status: ProposalStatus;
  pool_models: {
    name: string;
    length: number | null;
    width: number | null;
    depth: number | null;
    photo_url: string | null;
    differentials: string[];
    included_items: string[];
    not_included_items: string[];
    base_price: number;
    delivery_days: number;
    installation_days: number;
    payment_terms: string | null;
    notes: string | null;
    category_id: string;
  } | null;
  stores: { name: string } | null;
}

export const STATUS_CONFIG: Record<ProposalStatus, { label: string; className: string; color: string }> = {
  nova: { label: "Nova", className: "bg-blue-100 text-blue-700 border-blue-200", color: "hsl(var(--primary))" },
  enviada: { label: "Enviada", className: "bg-indigo-100 text-indigo-700 border-indigo-200", color: "#6366f1" },
  em_negociacao: { label: "Em Negociação", className: "bg-amber-100 text-amber-700 border-amber-200", color: "#f59e0b" },
  fechada: { label: "Fechada", className: "bg-emerald-100 text-emerald-700 border-emerald-200", color: "#10b981" },
  perdida: { label: "Perdida", className: "bg-red-100 text-red-700 border-red-200", color: "#ef4444" },
};

// Probability of closing per status
export const STATUS_PROBABILITY: Record<ProposalStatus, number> = {
  nova: 0.2,
  enviada: 0.3,
  em_negociacao: 0.5,
  fechada: 1.0,
  perdida: 0.0,
};

export const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export const daysSince = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export type Priority = "alta" | "media" | "baixa";

export const getPriority = (p: Proposal): Priority => {
  const days = daysSince(p.created_at);
  const isHighValue = p.total_price > 50000;
  const isActive = p.status === "em_negociacao" || p.status === "enviada";

  if (isHighValue && isActive) return "alta";
  if (isActive && days > 7) return "alta";
  if (isActive && days > 3) return "media";
  if (p.status === "nova" && days > 5) return "media";
  return "baixa";
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; dot: string }> = {
  alta: { label: "Alta", className: "text-red-600", dot: "bg-red-500" },
  media: { label: "Média", className: "text-amber-600", dot: "bg-amber-500" },
  baixa: { label: "Baixa", className: "text-muted-foreground", dot: "bg-muted-foreground" },
};

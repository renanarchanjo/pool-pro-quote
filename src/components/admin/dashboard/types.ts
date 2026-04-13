export type ProposalStatus = "nova" | "enviada" | "em_negociacao" | "fechada" | "perdida";

export interface Proposal {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  created_by: string | null;
  model_id: string | null;
  selected_optionals: any;
  store_id: string | null;
  status: ProposalStatus;
  pool_models: {
    id: string;
    name: string;
    length: number | null;
    width: number | null;
    depth: number | null;
    photo_url: string | null;
    differentials: string[];
    included_items: string[];
    not_included_items: string[];
    base_price: number;
    cost: number | null;
    delivery_days: number;
    installation_days: number;
    payment_terms: string | null;
    notes: string | null;
    category_id: string;
    categories?: { name: string; brand_id: string | null; brands?: { name: string; logo_url: string | null; partner_id: string | null } | null } | null;
    _included_items_cost?: number;
  } | null;
  stores: { name: string } | null;
}

export const STATUS_CONFIG: Record<ProposalStatus, { label: string; className: string; color: string; badgeBg: string; badgeText: string }> = {
  nova:           { label: "Nova",           className: "bg-[#E0F2FE] text-[#0369A1] border-[#E0F2FE]", color: "#0EA5E9", badgeBg: "#E0F2FE", badgeText: "#0369A1" },
  enviada:        { label: "Enviada",        className: "bg-[#EDE9FE] text-[#5B21B6] border-[#EDE9FE]", color: "#8B5CF6", badgeBg: "#EDE9FE", badgeText: "#5B21B6" },
  em_negociacao:  { label: "Em Negociação",  className: "bg-[#FEF3C7] text-[#92400E] border-[#FEF3C7]", color: "#F59E0B", badgeBg: "#FEF3C7", badgeText: "#92400E" },
  fechada:        { label: "Fechada",        className: "bg-[#F0FDF4] text-[#166534] border-[#F0FDF4]", color: "#16A34A", badgeBg: "#F0FDF4", badgeText: "#166534" },
  perdida:        { label: "Perdida",        className: "bg-[#FEF2F2] text-[#991B1B] border-[#FEF2F2]", color: "#EF4444", badgeBg: "#FEF2F2", badgeText: "#991B1B" },
};

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

export const formatDays = (days: number): string => {
  if (days === 0) return "Hoje";
  return `${days}d`;
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
  alta: { label: "Alta", className: "text-[#DC2626]", dot: "bg-[#DC2626]" },
  media: { label: "Média", className: "text-[#D97706]", dot: "bg-[#D97706]" },
  baixa: { label: "Baixa", className: "text-muted-foreground", dot: "bg-muted-foreground" },
};

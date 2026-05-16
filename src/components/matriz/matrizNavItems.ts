import {
  LayoutGrid, CircleAlert, Building2, Users, Wallet,
  MapPinned, Filter, Radar, Package, LineChart,
  type LucideIcon,
} from "lucide-react";

export interface MatrizNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface MatrizNavGroup {
  label: string;
  items: MatrizNavItem[];
}

export function getMatrizNavGroups(): MatrizNavGroup[] {
  const mainItems: MatrizNavItem[] = [
    { title: "Dashboard", url: "/matriz", icon: LayoutGrid },
    { title: "Marcas", url: "/matriz/parceiros", icon: Users },
    { title: "Catálogo de Marcas", url: "/matriz/catalogo-parceiros", icon: Package },
    { title: "Lojas Ativas", url: "/matriz/lojistas", icon: Building2 },
    { title: "Mapa de Lojas", url: "/matriz/mapa", icon: MapPinned },
    { title: "Raio de Cobertura", url: "/matriz/cobertura", icon: Radar },
    { title: "Distribuição de Leads", url: "/matriz/leads", icon: Filter },
    { title: "Preços e Planos", url: "/matriz/planos", icon: Wallet },
    { title: "Controle Financeiro", url: "/matriz/financeiro", icon: LineChart },
    { title: "Inadimplência", url: "/matriz/inadimplencia", icon: CircleAlert },
  ];

  return [
    { label: "Principal", items: mainItems },
  ];
}

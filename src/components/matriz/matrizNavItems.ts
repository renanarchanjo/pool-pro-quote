import {
  LayoutGrid, CircleAlert, Building2, Users, Wallet,
  MapPinned, Filter, Radar, Package,
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
    { title: "Lojas Ativas", url: "/matriz/lojistas", icon: Building2 },
    { title: "Cobertura", url: "/matriz/cobertura", icon: Radar },
    { title: "Parceiros", url: "/matriz/parceiros", icon: Users },
    { title: "Catálogo de Parceiros", url: "/matriz/catalogo-parceiros", icon: Package },
    { title: "Mapa de Lojistas", url: "/matriz/mapa", icon: MapPinned },
  ];

  const operacaoItems: MatrizNavItem[] = [
    { title: "Leads", url: "/matriz/leads", icon: Filter },
    { title: "Planos e Preços", url: "/matriz/planos", icon: Wallet },
    { title: "Inadimplência", url: "/matriz/inadimplencia", icon: CircleAlert },
  ];

  return [
    { label: "Principal", items: mainItems },
    { label: "Operação", items: operacaoItems },
  ];
}

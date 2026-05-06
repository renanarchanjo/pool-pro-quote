import {
  LayoutGrid, FilePlus, Layers, Boxes, Package, UserCircle, Users, UsersRound,
  CreditCard, Receipt, TrendingUp, DollarSign, Handshake, FileText, Contact,
  type LucideIcon,
} from "lucide-react";

export interface SidebarNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
  /** Hide this group on mobile bottom-nav layouts */
  hideOnMobile?: boolean;
  /** When true, render as a collapsible parent (Catálogo) */
  collapsible?: boolean;
  /** Icon for the collapsible parent */
  parentIcon?: LucideIcon;
}

export function getAdminNavGroups(isOwner: boolean): SidebarNavGroup[] {
  const mainItems: SidebarNavItem[] = [
    { title: "Dashboard", url: "/admin", icon: LayoutGrid },
    { title: "Gerar Nova Proposta", url: "/admin/gerar-proposta", icon: FilePlus },
    { title: "Contratos", url: "/admin/contratos", icon: FileText },
    { title: "Clientes (Follow-up)", url: "/admin/clientes", icon: Contact },
    { title: "Leads (SimulaPool)", url: "/admin/leads", icon: Users },
  ];

  const catalogItems: SidebarNavItem[] = isOwner
    ? [
        { title: "Marcas Parceiras", url: "/admin/parceiros", icon: Handshake },
        { title: "Marcas e Categorias", url: "/admin/marcas", icon: Layers },
        { title: "Modelos", url: "/admin/modelos", icon: Boxes },
        { title: "Opcionais", url: "/admin/opcionais", icon: Package },
      ]
    : [];

  const accountItems: SidebarNavItem[] = [
    { title: "Minha Conta", url: "/admin/perfil", icon: UserCircle },
    ...(!isOwner
      ? [
          { title: "Performance", url: "/admin/performance", icon: TrendingUp },
          { title: "Comissão", url: "/admin/comissao", icon: DollarSign },
        ]
      : [
          { title: "Equipe", url: "/admin/equipe", icon: UsersRound },
          { title: "Assinatura", url: "/admin/assinatura", icon: CreditCard },
          { title: "Faturas", url: "/admin/faturas", icon: Receipt },
        ]),
  ];

  return [
    { label: "Painel Comercial", items: mainItems },
    { label: "Catálogo", items: catalogItems, hideOnMobile: true, collapsible: true, parentIcon: Package },
    { label: "Conta", items: accountItems },
  ];
}


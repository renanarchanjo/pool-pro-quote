import {
  LayoutGrid, FilePlus, Layers, Boxes, Package, UserCircle, Users, UsersRound,
  CreditCard, Receipt, TrendingUp, DollarSign, Handshake, FolderTree, FileText,
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
    { title: "Leads (Tráfego)", url: "/admin/leads", icon: Users },
    { title: "Contratos", url: "/admin/contratos", icon: FileText },
  ];

  const catalogItems: SidebarNavItem[] = isOwner
    ? [
        { title: "Marcas Parceiras", url: "/admin/parceiros", icon: Handshake },
        { title: "Marcas", url: "/admin/marcas", icon: Layers },
        { title: "Categorias de Marcas", url: "/admin/categorias", icon: FolderTree },
        { title: "Modelos e Opcionais", url: "/admin/modelos", icon: Boxes },
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
          { title: "Minha Equipe", url: "/admin/equipe", icon: UsersRound },
          { title: "Faturas", url: "/admin/faturas", icon: Receipt },
          { title: "Assinatura", url: "/admin/assinatura", icon: CreditCard },
        ]),
  ];

  return [
    { label: "Painel Comercial", items: mainItems },
    { label: "Cadastro", items: catalogItems, hideOnMobile: true },
    { label: "Conta", items: accountItems },
  ];
}

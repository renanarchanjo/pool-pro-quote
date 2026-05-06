/**
 * Mapa central de prefetch dos chunks das sub-páginas do Admin.
 * Usar a mesma referência de import garante que o Vite reaproveite o chunk
 * quando a rota for finalmente renderizada (sem novo download).
 */

const loaders: Record<string, () => Promise<unknown>> = {
  "/admin": () => import("@/components/admin/AdminDashboard"),
  "/admin/gerar-proposta": () => import("@/components/admin/ManualProposal"),
  "/admin/leads": () => import("@/components/admin/AdminLeads"),
  "/admin/clientes": () => import("@/components/admin/AdminClients"),
  "/admin/faturas": () => import("@/components/admin/InvoiceHistory"),
  "/admin/contratos": () => import("@/components/admin/ContractsManager"),
  "/admin/perfil": () => import("@/components/admin/AdminProfile"),
  "/admin/marcas": () => import("@/components/admin/BrandsAndCategoriesPage"),
  "/admin/modelos": () => import("@/components/admin/PoolModelManager"),
  "/admin/opcionais": () => import("@/components/admin/OptionalManager"),
  "/admin/equipe": () => import("@/components/admin/TeamManager"),
  "/admin/lojistas": () => import("@/components/admin/StoresManager"),
  "/admin/assinatura": () => import("@/components/admin/SubscriptionManager"),
  "/admin/parceiros": () => import("@/components/admin/StorePartnersManager"),
  "/admin/performance": () => import("@/components/admin/TeamPerformance"),
  "/admin/comissao": () => import("@/components/admin/TeamCommissions"),
};

const requested = new Set<string>();

export function prefetchAdminRoute(url: string) {
  if (requested.has(url)) return;
  const loader = loaders[url];
  if (!loader) return;
  requested.add(url);
  loader().catch(() => requested.delete(url));
}

const idle = (cb: () => void) => {
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb, { timeout: 3000 });
  } else {
    setTimeout(cb, 800);
  }
};

/**
 * Prefetcha em sequência (uma por vez, sempre em idle) todos os chunks
 * de sub-páginas do Admin. Chamar depois que o Admin monta.
 */
export function prefetchAllAdminRoutes() {
  const urls = Object.keys(loaders);
  let i = 0;
  const next = () => {
    if (i >= urls.length) return;
    const url = urls[i++];
    idle(() => {
      prefetchAdminRoute(url);
      next();
    });
  };
  next();
}

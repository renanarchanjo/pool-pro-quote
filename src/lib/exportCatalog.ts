import { supabase } from "@/integrations/supabase/client";

export const CATALOG_SCHEMA_VERSION = "1.0";

export interface ExportedCatalog {
  schema_version: string;
  exported_at: string;
  source_store_name: string;
  brands: ExportedBrand[];
  optional_groups: ExportedOptionalGroup[];
  included_item_templates: ExportedItemTemplate[];
}

interface ExportedBrand {
  name: string;
  description: string | null;
  categories: ExportedCategory[];
}
interface ExportedCategory {
  name: string;
  description: string | null;
  models: ExportedModel[];
}
interface ExportedModel {
  name: string;
  length: number | null;
  width: number | null;
  depth: number | null;
  delivery_days: number | null;
  installation_days: number | null;
  payment_terms: string | null;
  notes: string | null;
  photo_url: string | null;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  display_order: number;
  optionals: ExportedModelOptional[];
  included_item_entries: ExportedModelIncludedItem[];
}
interface ExportedModelOptional {
  name: string;
  description: string | null;
  item_type: string;
  display_order: number;
}
interface ExportedModelIncludedItem {
  name: string;
  quantity: number;
  item_type: string;
  display_order: number;
}
interface ExportedOptionalGroup {
  name: string;
  description: string | null;
  selection_type: string;
  display_order: number;
  optionals: ExportedOptional[];
}
interface ExportedOptional {
  name: string;
  description: string | null;
  warning_note: string | null;
  display_order: number;
}
interface ExportedItemTemplate {
  name: string;
  not_included_items: string[];
  items: ExportedItemTemplateItem[];
}
interface ExportedItemTemplateItem {
  name: string;
  quantity: number;
  item_type: string;
  display_order: number;
}

export async function exportStoreCatalog(storeId: string, storeName: string): Promise<ExportedCatalog> {
  const [brandsRes, catsRes, modelsRes, modelOptsRes, modelIncRes, optGroupsRes, optsRes, tmplsRes, tmplItemsRes] = await Promise.all([
    supabase.from("brands").select("id, name, description").eq("store_id", storeId).eq("active", true),
    supabase.from("categories").select("id, name, description, brand_id").eq("store_id", storeId).eq("active", true),
    supabase.from("pool_models").select("id, name, category_id, length, width, depth, delivery_days, installation_days, payment_terms, notes, photo_url, differentials, included_items, not_included_items, display_order").eq("store_id", storeId).eq("active", true),
    supabase.from("model_optionals").select("model_id, name, description, item_type, display_order").eq("store_id", storeId).eq("active", true),
    supabase.from("model_included_items").select("model_id, name, quantity, item_type, display_order").eq("store_id", storeId).eq("active", true),
    supabase.from("optional_groups").select("id, name, description, selection_type, display_order").eq("store_id", storeId).eq("active", true),
    supabase.from("optionals").select("id, group_id, name, description, warning_note, display_order").eq("store_id", storeId).eq("active", true),
    supabase.from("included_item_templates").select("id, name, not_included_items").eq("store_id", storeId),
    supabase.from("included_item_template_items").select("template_id, name, quantity, item_type, display_order").eq("store_id", storeId),
  ]);

  for (const r of [brandsRes, catsRes, modelsRes, modelOptsRes, modelIncRes, optGroupsRes, optsRes, tmplsRes, tmplItemsRes]) {
    if (r.error) throw r.error;
  }

  const brands = (brandsRes.data || []).map((b: any): ExportedBrand => {
    const cats = (catsRes.data || []).filter((c: any) => c.brand_id === b.id);
    return {
      name: b.name,
      description: b.description,
      categories: cats.map((c: any): ExportedCategory => {
        const models = (modelsRes.data || []).filter((m: any) => m.category_id === c.id);
        return {
          name: c.name,
          description: c.description,
          models: models.map((m: any): ExportedModel => ({
            name: m.name,
            length: m.length, width: m.width, depth: m.depth,
            delivery_days: m.delivery_days, installation_days: m.installation_days,
            payment_terms: m.payment_terms, notes: m.notes, photo_url: m.photo_url,
            differentials: m.differentials || [],
            included_items: m.included_items || [],
            not_included_items: m.not_included_items || [],
            display_order: m.display_order ?? 0,
            optionals: (modelOptsRes.data || []).filter((o: any) => o.model_id === m.id)
              .map((o: any) => ({ name: o.name, description: o.description, item_type: o.item_type, display_order: o.display_order ?? 0 })),
            included_item_entries: (modelIncRes.data || []).filter((i: any) => i.model_id === m.id)
              .map((i: any) => ({ name: i.name, quantity: i.quantity ?? 1, item_type: i.item_type, display_order: i.display_order ?? 0 })),
          })),
        };
      }),
    };
  });

  const optional_groups = (optGroupsRes.data || []).map((g: any): ExportedOptionalGroup => ({
    name: g.name, description: g.description, selection_type: g.selection_type, display_order: g.display_order ?? 0,
    optionals: (optsRes.data || []).filter((o: any) => o.group_id === g.id)
      .map((o: any) => ({ name: o.name, description: o.description, warning_note: o.warning_note, display_order: o.display_order ?? 0 })),
  }));

  const included_item_templates = (tmplsRes.data || []).map((t: any): ExportedItemTemplate => ({
    name: t.name,
    not_included_items: t.not_included_items || [],
    items: (tmplItemsRes.data || []).filter((i: any) => i.template_id === t.id)
      .map((i: any) => ({ name: i.name, quantity: i.quantity ?? 1, item_type: i.item_type, display_order: i.display_order ?? 0 })),
  }));

  return {
    schema_version: CATALOG_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    source_store_name: storeName,
    brands,
    optional_groups,
    included_item_templates,
  };
}

export function downloadCatalogJson(catalog: ExportedCatalog, storeName: string) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = storeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `catalogo-${slug || "loja"}-${date}.json`;
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

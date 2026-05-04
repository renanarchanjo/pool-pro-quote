import { supabase } from "@/integrations/supabase/client";

export const CATALOG_SCHEMA_VERSION = "1.0";

export interface ExportedCatalog {
  schema_version: string;
  exported_at: string;
  store_name: string;
  brands: Array<{
    name: string;
    description: string | null;
    categories: Array<{
      name: string;
      description: string | null;
      display_order?: number;
      models: Array<{
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
        display_order?: number;
        optionals: Array<{ name: string; description: string | null; item_type: string }>;
        included_items_detail: Array<{ name: string; quantity: number; item_type: string; display_order?: number }>;
      }>;
    }>;
  }>;
  optional_groups: Array<{
    name: string;
    description: string | null;
    selection_type: string;
    optionals: Array<{ name: string; description: string | null; warning_note: string | null; item_type: string }>;
  }>;
  item_templates: Array<{
    name: string;
    not_included_items: string[];
    items: Array<{ name: string; quantity: number; item_type: string; display_order?: number }>;
  }>;
}

/**
 * Builds a JSON catalog (no prices, no IDs, no store_id) for the given store.
 */
export async function buildStoreCatalogExport(storeId: string, storeName: string): Promise<ExportedCatalog> {
  const [
    brandsRes,
    catsRes,
    modelsRes,
    modelOptsRes,
    modelInclRes,
    optGroupsRes,
    optsRes,
    templatesRes,
    templateItemsRes,
  ] = await Promise.all([
    supabase.from("brands").select("id, name, description").eq("store_id", storeId).order("name"),
    supabase.from("categories").select("id, name, description, brand_id").eq("store_id", storeId).order("name"),
    supabase.from("pool_models").select("id, name, category_id, length, width, depth, delivery_days, installation_days, payment_terms, notes, photo_url, differentials, included_items, not_included_items, display_order").eq("store_id", storeId).order("display_order"),
    supabase.from("model_optionals").select("id, model_id, name, description, item_type").eq("store_id", storeId).order("display_order"),
    supabase.from("model_included_items").select("id, model_id, name, quantity, item_type, display_order").eq("store_id", storeId).order("display_order"),
    supabase.from("optional_groups").select("id, name, description, selection_type").eq("store_id", storeId).order("display_order"),
    supabase.from("optionals").select("id, name, description, warning_note, item_type, group_id").eq("store_id", storeId).order("display_order"),
    supabase.from("included_item_templates").select("id, name, not_included_items").eq("store_id", storeId),
    supabase.from("included_item_template_items").select("id, template_id, name, quantity, item_type, display_order").eq("store_id", storeId).order("display_order"),
  ]);

  const errs = [brandsRes, catsRes, modelsRes, modelOptsRes, modelInclRes, optGroupsRes, optsRes, templatesRes, templateItemsRes].filter(r => r.error);
  if (errs.length) throw new Error(errs.map(e => e.error?.message).join("; "));

  const optsByGroup = new Map<string, any[]>();
  for (const o of optsRes.data || []) {
    if (!o.group_id) continue;
    if (!optsByGroup.has(o.group_id)) optsByGroup.set(o.group_id, []);
    optsByGroup.get(o.group_id)!.push(o);
  }

  const itemsByTemplate = new Map<string, any[]>();
  for (const it of templateItemsRes.data || []) {
    if (!itemsByTemplate.has(it.template_id)) itemsByTemplate.set(it.template_id, []);
    itemsByTemplate.get(it.template_id)!.push(it);
  }

  const optsByModel = new Map<string, any[]>();
  for (const o of modelOptsRes.data || []) {
    if (!optsByModel.has(o.model_id)) optsByModel.set(o.model_id, []);
    optsByModel.get(o.model_id)!.push(o);
  }

  const inclByModel = new Map<string, any[]>();
  for (const i of modelInclRes.data || []) {
    if (!inclByModel.has(i.model_id)) inclByModel.set(i.model_id, []);
    inclByModel.get(i.model_id)!.push(i);
  }

  const modelsByCat = new Map<string, any[]>();
  for (const m of modelsRes.data || []) {
    if (!m.category_id) continue;
    if (!modelsByCat.has(m.category_id)) modelsByCat.set(m.category_id, []);
    modelsByCat.get(m.category_id)!.push(m);
  }

  const catsByBrand = new Map<string, any[]>();
  for (const c of catsRes.data || []) {
    if (!c.brand_id) continue;
    if (!catsByBrand.has(c.brand_id)) catsByBrand.set(c.brand_id, []);
    catsByBrand.get(c.brand_id)!.push(c);
  }

  return {
    schema_version: CATALOG_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    store_name: storeName,
    brands: (brandsRes.data || []).map(b => ({
      name: b.name,
      description: b.description,
      categories: (catsByBrand.get(b.id) || []).map(c => ({
        name: c.name,
        description: c.description,
        models: (modelsByCat.get(c.id) || []).map(m => ({
          name: m.name,
          length: m.length, width: m.width, depth: m.depth,
          delivery_days: m.delivery_days, installation_days: m.installation_days,
          payment_terms: m.payment_terms, notes: m.notes, photo_url: m.photo_url,
          differentials: m.differentials || [],
          included_items: m.included_items || [],
          not_included_items: m.not_included_items || [],
          display_order: m.display_order,
          optionals: (optsByModel.get(m.id) || []).map(o => ({
            name: o.name, description: o.description, item_type: o.item_type,
          })),
          included_items_detail: (inclByModel.get(m.id) || []).map(i => ({
            name: i.name, quantity: i.quantity, item_type: i.item_type, display_order: i.display_order,
          })),
        })),
      })),
    })),
    optional_groups: (optGroupsRes.data || []).map(g => ({
      name: g.name,
      description: g.description,
      selection_type: g.selection_type,
      optionals: (optsByGroup.get(g.id) || []).map(o => ({
        name: o.name, description: o.description, warning_note: o.warning_note, item_type: o.item_type,
      })),
    })),
    item_templates: (templatesRes.data || []).map(t => ({
      name: t.name,
      not_included_items: t.not_included_items || [],
      items: (itemsByTemplate.get(t.id) || []).map(i => ({
        name: i.name, quantity: i.quantity, item_type: i.item_type, display_order: i.display_order,
      })),
    })),
  };
}

export async function downloadStoreCatalog(storeId: string, storeName: string) {
  const data = await buildStoreCatalogExport(storeId, storeName);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `catalogo-${safeName}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

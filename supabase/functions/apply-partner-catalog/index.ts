// Edge function: apply-partner-catalog
// Copies a partner's default catalog to a store's tables (idempotent per partner+store).
// Auth required. Caller must own the target store (or be super_admin).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface Body { partner_id: string; store_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json() as Body;
    if (!body.partner_id || !body.store_id) {
      return new Response(JSON.stringify({ error: "partner_id e store_id obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authorize: caller must be super_admin OR owner of the store
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    if (!roleSet.has("super_admin")) {
      const { data: profile } = await admin.from("profiles").select("store_id").eq("id", userData.user.id).maybeSingle();
      if (!profile || profile.store_id !== body.store_id || !roleSet.has("owner")) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Pull catalog
    const [pcb, pcc, pcm, pcmo, pcmi, pcog, pco, pcit, pciti] = await Promise.all([
      admin.from("partner_catalog_brands").select("*").eq("partner_id", body.partner_id),
      admin.from("partner_catalog_categories").select("*"),
      admin.from("partner_catalog_models").select("*"),
      admin.from("partner_catalog_model_optionals").select("*"),
      admin.from("partner_catalog_model_included_items").select("*"),
      admin.from("partner_catalog_optional_groups").select("*").eq("partner_id", body.partner_id),
      admin.from("partner_catalog_optionals").select("*"),
      admin.from("partner_catalog_item_templates").select("*").eq("partner_id", body.partner_id),
      admin.from("partner_catalog_item_template_items").select("*"),
    ]);

    const errAny = [pcb, pcc, pcm, pcmo, pcmi, pcog, pco, pcit, pciti].find(r => r.error);
    if (errAny?.error) throw errAny.error;

    if (!pcb.data?.length) {
      return new Response(JSON.stringify({ ok: true, applied: false, reason: "Sem catálogo padrão para este parceiro" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const brandIds = new Set(pcb.data.map((b: any) => b.id));
    const cats = (pcc.data || []).filter((c: any) => brandIds.has(c.partner_catalog_brand_id));
    const catIds = new Set(cats.map((c: any) => c.id));
    const models = (pcm.data || []).filter((m: any) => catIds.has(m.partner_catalog_category_id));
    const modelIds = new Set(models.map((m: any) => m.id));
    const modelOpts = (pcmo.data || []).filter((o: any) => modelIds.has(o.partner_catalog_model_id));
    const modelIncl = (pcmi.data || []).filter((i: any) => modelIds.has(i.partner_catalog_model_id));
    const groupIds = new Set((pcog.data || []).map((g: any) => g.id));
    const opts = (pco.data || []).filter((o: any) => groupIds.has(o.partner_catalog_optional_group_id));
    const tplIds = new Set((pcit.data || []).map((t: any) => t.id));
    const tplItems = (pciti.data || []).filter((i: any) => tplIds.has(i.partner_catalog_item_template_id));

    const counts = { brands: 0, categories: 0, models: 0, model_optionals: 0, model_included_items: 0, optional_groups: 0, optionals: 0, item_templates: 0, item_template_items: 0 };

    // BRANDS
    const brandIdMap = new Map<string, string>();
    for (const b of pcb.data) {
      const { data: existing } = await admin.from("brands")
        .select("id").eq("store_id", body.store_id).eq("partner_id", body.partner_id).eq("name", b.name).maybeSingle();
      if (existing) { brandIdMap.set(b.id, existing.id); continue; }
      const { data: ins, error } = await admin.from("brands").insert({
        store_id: body.store_id, partner_id: body.partner_id,
        name: b.name, description: b.description, active: true, partner_locked: true,
      }).select("id").single();
      if (error) throw error;
      brandIdMap.set(b.id, ins.id); counts.brands++;
    }

    // CATEGORIES
    const catIdMap = new Map<string, string>();
    for (const c of cats) {
      const targetBrandId = brandIdMap.get(c.partner_catalog_brand_id);
      if (!targetBrandId) continue;
      const { data: existing } = await admin.from("categories")
        .select("id").eq("store_id", body.store_id).eq("brand_id", targetBrandId).eq("name", c.name).maybeSingle();
      if (existing) { catIdMap.set(c.id, existing.id); continue; }
      const { data: ins, error } = await admin.from("categories").insert({
        store_id: body.store_id, brand_id: targetBrandId,
        name: c.name, description: c.description, active: true, partner_locked: true,
      }).select("id").single();
      if (error) throw error;
      catIdMap.set(c.id, ins.id); counts.categories++;
    }

    // POOL MODELS
    const modelIdMap = new Map<string, string>();
    for (const m of models) {
      const targetCatId = catIdMap.get(m.partner_catalog_category_id);
      if (!targetCatId) continue;
      const { data: existing } = await admin.from("pool_models")
        .select("id").eq("store_id", body.store_id).eq("category_id", targetCatId).eq("name", m.name).maybeSingle();
      if (existing) { modelIdMap.set(m.id, existing.id); continue; }
      const { data: ins, error } = await admin.from("pool_models").insert({
        store_id: body.store_id, category_id: targetCatId,
        name: m.name, length: m.length, width: m.width, depth: m.depth,
        delivery_days: m.delivery_days ?? 30, installation_days: m.installation_days ?? 5,
        payment_terms: m.payment_terms || "À vista", notes: m.notes, photo_url: m.photo_url,
        differentials: m.differentials || [], included_items: m.included_items || [],
        not_included_items: m.not_included_items || [],
        base_price: 0, cost: 0, margin_percent: 0,
        display_order: m.display_order || 0, active: true,
        partner_locked: true, partner_locked_source: body.partner_id,
      }).select("id").single();
      if (error) throw error;
      modelIdMap.set(m.id, ins.id); counts.models++;
    }

    // MODEL OPTIONALS
    for (const o of modelOpts) {
      const targetModel = modelIdMap.get(o.partner_catalog_model_id);
      if (!targetModel) continue;
      const { data: existing } = await admin.from("model_optionals")
        .select("id").eq("store_id", body.store_id).eq("model_id", targetModel).eq("name", o.name).maybeSingle();
      if (existing) continue;
      const { error } = await admin.from("model_optionals").insert({
        store_id: body.store_id, model_id: targetModel,
        name: o.name, description: o.description, item_type: o.item_type || "material",
        price: 0, cost: 0, margin_percent: 0,
        display_order: o.display_order || 0, active: true, partner_locked: true,
      });
      if (error) throw error;
      counts.model_optionals++;
    }

    // MODEL INCLUDED ITEMS
    for (const i of modelIncl) {
      const targetModel = modelIdMap.get(i.partner_catalog_model_id);
      if (!targetModel) continue;
      const { data: existing } = await admin.from("model_included_items")
        .select("id").eq("store_id", body.store_id).eq("model_id", targetModel).eq("name", i.name).maybeSingle();
      if (existing) continue;
      const { error } = await admin.from("model_included_items").insert({
        store_id: body.store_id, model_id: targetModel,
        name: i.name, quantity: i.quantity || 1, item_type: i.item_type || "material",
        price: 0, cost: 0, margin_percent: 0,
        display_order: i.display_order || 0, active: true, partner_locked: true,
      });
      if (error) throw error;
      counts.model_included_items++;
    }

    // OPTIONAL GROUPS
    const groupIdMap = new Map<string, string>();
    for (const g of pcog.data || []) {
      const { data: existing } = await admin.from("optional_groups")
        .select("id").eq("store_id", body.store_id).eq("name", g.name).maybeSingle();
      if (existing) { groupIdMap.set(g.id, existing.id); continue; }
      const { data: ins, error } = await admin.from("optional_groups").insert({
        store_id: body.store_id, name: g.name, description: g.description,
        selection_type: g.selection_type || "multiple",
        display_order: g.display_order || 0, active: true, partner_locked: true,
      }).select("id").single();
      if (error) throw error;
      groupIdMap.set(g.id, ins.id); counts.optional_groups++;
    }

    // OPTIONALS
    for (const o of opts) {
      const targetGroup = groupIdMap.get(o.partner_catalog_optional_group_id);
      if (!targetGroup) continue;
      const { data: existing } = await admin.from("optionals")
        .select("id").eq("store_id", body.store_id).eq("group_id", targetGroup).eq("name", o.name).maybeSingle();
      if (existing) continue;
      const { error } = await admin.from("optionals").insert({
        store_id: body.store_id, group_id: targetGroup,
        name: o.name, description: o.description, warning_note: o.warning_note,
        item_type: o.item_type || "material",
        price: 0, cost: 0, margin_percent: 0,
        display_order: o.display_order || 0, active: true, partner_locked: true,
      });
      if (error) throw error;
      counts.optionals++;
    }

    // ITEM TEMPLATES
    const tplIdMap = new Map<string, string>();
    for (const t of pcit.data || []) {
      const { data: existing } = await admin.from("included_item_templates")
        .select("id").eq("store_id", body.store_id).eq("name", t.name).maybeSingle();
      if (existing) { tplIdMap.set(t.id, existing.id); continue; }
      const { data: ins, error } = await admin.from("included_item_templates").insert({
        store_id: body.store_id, name: t.name,
        not_included_items: t.not_included_items || [], partner_locked: true,
      }).select("id").single();
      if (error) throw error;
      tplIdMap.set(t.id, ins.id); counts.item_templates++;
    }

    // ITEM TEMPLATE ITEMS
    for (const i of tplItems) {
      const targetTpl = tplIdMap.get(i.partner_catalog_item_template_id);
      if (!targetTpl) continue;
      const { data: existing } = await admin.from("included_item_template_items")
        .select("id").eq("store_id", body.store_id).eq("template_id", targetTpl).eq("name", i.name).maybeSingle();
      if (existing) continue;
      const { error } = await admin.from("included_item_template_items").insert({
        store_id: body.store_id, template_id: targetTpl,
        name: i.name, quantity: i.quantity || 1, item_type: i.item_type || "material",
        price: 0, cost: 0, margin_percent: 0,
        display_order: i.display_order || 0, partner_locked: true,
      });
      if (error) throw error;
      counts.item_template_items++;
    }

    return new Response(JSON.stringify({ ok: true, applied: true, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[apply-partner-catalog] error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

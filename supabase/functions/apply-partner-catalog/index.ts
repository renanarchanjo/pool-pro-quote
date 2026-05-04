// Edge function: apply-partner-catalog
// Copies partner standard catalog into a store's tables, marking entries as partner_locked.
// Strategy: delete existing partner_locked rows for this store/partner, then recreate.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface Body { store_id: string; partner_id: string }

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;
    if (!body?.store_id || !body?.partner_id) {
      return new Response(JSON.stringify({ error: "store_id e partner_id obrigatórios" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, service);

    // Authorization: caller must be owner of the store OR super_admin
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      admin.from("profiles").select("store_id").eq("id", userId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    const isSuper = roleRow?.role === "super_admin";
    const isOwnerOfStore = roleRow?.role === "owner" && profile?.store_id === body.store_id;
    if (!isSuper && !isOwnerOfStore) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Check if partner has catalog
    const { data: pBrands, error: pBrandsErr } = await admin
      .from("partner_catalog_brands").select("id, name, description").eq("partner_id", body.partner_id);
    if (pBrandsErr) throw pBrandsErr;

    const hasCatalog = (pBrands?.length || 0) > 0;
    if (!hasCatalog) {
      // Nothing to apply but also check optional groups / templates
      const [{ data: oGroups }, { data: tmpls }] = await Promise.all([
        admin.from("partner_catalog_optional_groups").select("id").eq("partner_id", body.partner_id).limit(1),
        admin.from("partner_catalog_item_templates").select("id").eq("partner_id", body.partner_id).limit(1),
      ]);
      if (!oGroups?.length && !tmpls?.length) {
        return new Response(JSON.stringify({ ok: true, applied: false, reason: "no_catalog" }), { headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // === DELETE existing partner_locked rows tied to this partner in this store ===
    // 1. Find brands of this store linked to this partner
    const { data: existingBrands } = await admin
      .from("brands").select("id").eq("store_id", body.store_id).eq("partner_id", body.partner_id).eq("partner_locked", true);
    const brandIds = (existingBrands || []).map((b: any) => b.id);

    if (brandIds.length) {
      // categories of those brands
      const { data: existingCats } = await admin.from("categories").select("id").in("brand_id", brandIds).eq("partner_locked", true);
      const catIds = (existingCats || []).map((c: any) => c.id);
      if (catIds.length) {
        const { data: existingModels } = await admin.from("pool_models").select("id").in("category_id", catIds).eq("partner_locked", true);
        const modelIds = (existingModels || []).map((m: any) => m.id);
        if (modelIds.length) {
          await admin.from("model_optionals").delete().in("model_id", modelIds).eq("partner_locked", true);
          await admin.from("model_included_items").delete().in("model_id", modelIds).eq("partner_locked", true);
          await admin.from("pool_models").delete().in("id", modelIds);
        }
        await admin.from("categories").delete().in("id", catIds);
      }
      await admin.from("brands").delete().in("id", brandIds);
    }

    // Optional groups & their optionals: identify by partner_locked_source mapping is complex
    // For groups/templates we use a name-based + partner_locked flag approach: delete all partner_locked groups/templates of this store that came from THIS partner.
    // Since there's no partner_id column on groups/templates, we use the source partner via the partner_catalog_optional_groups names: simpler approach -> delete all partner_locked groups with names from this partner's catalog.
    const { data: pGroupsForCleanup } = await admin
      .from("partner_catalog_optional_groups").select("name").eq("partner_id", body.partner_id);
    const pGroupNames = (pGroupsForCleanup || []).map((g: any) => g.name);
    if (pGroupNames.length) {
      const { data: existingGroups } = await admin
        .from("optional_groups").select("id").eq("store_id", body.store_id).eq("partner_locked", true).in("name", pGroupNames);
      const groupIds = (existingGroups || []).map((g: any) => g.id);
      if (groupIds.length) {
        await admin.from("optionals").delete().in("group_id", groupIds).eq("partner_locked", true);
        await admin.from("optional_groups").delete().in("id", groupIds);
      }
    }

    const { data: pTmplsForCleanup } = await admin
      .from("partner_catalog_item_templates").select("name").eq("partner_id", body.partner_id);
    const pTmplNames = (pTmplsForCleanup || []).map((t: any) => t.name);
    if (pTmplNames.length) {
      const { data: existingTmpls } = await admin
        .from("included_item_templates").select("id").eq("store_id", body.store_id).eq("partner_locked", true).in("name", pTmplNames);
      const tmplIds = (existingTmpls || []).map((t: any) => t.id);
      if (tmplIds.length) {
        await admin.from("included_item_template_items").delete().in("template_id", tmplIds).eq("partner_locked", true);
        await admin.from("included_item_templates").delete().in("id", tmplIds);
      }
    }

    // === INSERT from partner_catalog_* ===
    let insertedBrands = 0, insertedCategories = 0, insertedModels = 0, insertedOptionalGroups = 0, insertedTemplates = 0;

    // Brands
    for (const pb of pBrands || []) {
      const { data: newBrand, error: bErr } = await admin.from("brands").insert({
        name: pb.name, description: pb.description, store_id: body.store_id,
        partner_id: body.partner_id, partner_locked: true, active: true,
      }).select("id").single();
      if (bErr) throw bErr;
      insertedBrands++;

      const { data: pCats } = await admin
        .from("partner_catalog_categories").select("id, name, description, display_order")
        .eq("partner_catalog_brand_id", pb.id).order("display_order");
      for (const pc of pCats || []) {
        const { data: newCat, error: cErr } = await admin.from("categories").insert({
          name: pc.name, description: pc.description, brand_id: newBrand.id, store_id: body.store_id,
          partner_locked: true, active: true,
        }).select("id").single();
        if (cErr) throw cErr;
        insertedCategories++;

        const { data: pModels } = await admin
          .from("partner_catalog_models").select("*").eq("partner_catalog_category_id", pc.id).order("display_order");
        for (const pm of pModels || []) {
          const { data: newModel, error: mErr } = await admin.from("pool_models").insert({
            name: pm.name, category_id: newCat.id, store_id: body.store_id,
            base_price: 0, cost: 0, margin_percent: 0,
            length: pm.length, width: pm.width, depth: pm.depth,
            delivery_days: pm.delivery_days, installation_days: pm.installation_days,
            payment_terms: pm.payment_terms, notes: pm.notes, photo_url: pm.photo_url,
            differentials: pm.differentials || [], included_items: pm.included_items || [],
            not_included_items: pm.not_included_items || [],
            display_order: pm.display_order ?? 0, active: true,
            partner_locked: true, partner_locked_source: body.partner_id,
          }).select("id").single();
          if (mErr) throw mErr;
          insertedModels++;

          const { data: pmOpts } = await admin.from("partner_catalog_model_optionals")
            .select("name, description, item_type, display_order").eq("partner_catalog_model_id", pm.id);
          if (pmOpts?.length) {
            await admin.from("model_optionals").insert(pmOpts.map((o: any) => ({
              model_id: newModel.id, store_id: body.store_id,
              name: o.name, description: o.description, item_type: o.item_type, display_order: o.display_order ?? 0,
              price: 0, cost: 0, margin_percent: 0, active: true, partner_locked: true,
            })));
          }
          const { data: pmInc } = await admin.from("partner_catalog_model_included_items")
            .select("name, quantity, item_type, display_order").eq("partner_catalog_model_id", pm.id);
          if (pmInc?.length) {
            await admin.from("model_included_items").insert(pmInc.map((i: any) => ({
              model_id: newModel.id, store_id: body.store_id,
              name: i.name, quantity: i.quantity ?? 1, item_type: i.item_type, display_order: i.display_order ?? 0,
              price: 0, cost: 0, margin_percent: 0, active: true, partner_locked: true,
            })));
          }
        }
      }
    }

    // Optional groups
    const { data: pGroups } = await admin.from("partner_catalog_optional_groups")
      .select("id, name, description, selection_type, display_order").eq("partner_id", body.partner_id).order("display_order");
    for (const pg of pGroups || []) {
      const { data: newG, error: gErr } = await admin.from("optional_groups").insert({
        name: pg.name, description: pg.description, selection_type: pg.selection_type ?? "multiple",
        display_order: pg.display_order ?? 0, store_id: body.store_id, active: true, partner_locked: true,
      }).select("id").single();
      if (gErr) throw gErr;
      insertedOptionalGroups++;
      const { data: pOpts } = await admin.from("partner_catalog_optionals")
        .select("name, description, warning_note, display_order, item_type")
        .eq("partner_catalog_optional_group_id", pg.id).order("display_order");
      if (pOpts?.length) {
        await admin.from("optionals").insert(pOpts.map((o: any) => ({
          group_id: newG.id, store_id: body.store_id,
          name: o.name, description: o.description, warning_note: o.warning_note,
          display_order: o.display_order ?? 0, item_type: o.item_type ?? "material",
          price: 0, cost: 0, margin_percent: 0, active: true, partner_locked: true,
        })));
      }
    }

    // Item templates
    const { data: pTmpls } = await admin.from("partner_catalog_item_templates")
      .select("id, name, not_included_items").eq("partner_id", body.partner_id);
    for (const pt of pTmpls || []) {
      const { data: newT, error: tErr } = await admin.from("included_item_templates").insert({
        name: pt.name, not_included_items: pt.not_included_items || [],
        store_id: body.store_id, partner_locked: true,
      }).select("id").single();
      if (tErr) throw tErr;
      insertedTemplates++;
      const { data: pTi } = await admin.from("partner_catalog_item_template_items")
        .select("name, quantity, item_type, display_order").eq("partner_catalog_item_template_id", pt.id);
      if (pTi?.length) {
        await admin.from("included_item_template_items").insert(pTi.map((i: any) => ({
          template_id: newT.id, store_id: body.store_id,
          name: i.name, quantity: i.quantity ?? 1, item_type: i.item_type ?? "material",
          display_order: i.display_order ?? 0,
          price: 0, cost: 0, margin_percent: 0, partner_locked: true,
        })));
      }
    }

    return new Response(JSON.stringify({
      ok: true, applied: true,
      summary: { insertedBrands, insertedCategories, insertedModels, insertedOptionalGroups, insertedTemplates },
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("apply-partner-catalog error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

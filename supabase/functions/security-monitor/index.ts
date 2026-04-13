import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const log = (msg: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SECURITY-MONITOR] ${msg}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: somente service_role (cron/server) pode executar o monitor
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    if (token !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden: requires service role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let detected = 0;
    let inserted = 0;

    // Helper: check duplicate before insert
    async function insertIfNew(
      eventType: string,
      severity: string,
      opts: {
        userId?: string | null;
        storeId?: string | null;
        ipAddress?: string | null;
        details?: Record<string, unknown>;
      }
    ) {
      detected++;

      // Dedup: same event_type + (ip or user) in last 15 min
      let query = supabase
        .from("security_events")
        .select("id")
        .eq("event_type", eventType)
        .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

      if (opts.ipAddress) query = query.eq("ip_address", opts.ipAddress);
      if (opts.userId) query = query.eq("user_id", opts.userId);
      if (opts.storeId) query = query.eq("store_id", opts.storeId);

      const { data: existing } = await query.limit(1);
      if (existing && existing.length > 0) {
        log(`Duplicate skipped: ${eventType}`);
        return;
      }

      const { error } = await supabase.from("security_events").insert({
        event_type: eventType,
        severity,
        user_id: opts.userId ?? null,
        store_id: opts.storeId ?? null,
        ip_address: opts.ipAddress ?? null,
        details: opts.details ?? {},
      });

      if (error) {
        log(`Insert error for ${eventType}`, error.message);
      } else {
        inserted++;
        log(`Event inserted: ${eventType}`, opts.details);
      }
    }

    // 1. BRUTE FORCE — rate_limits with high count in last 30 min
    {
      const windowStart = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: rlRows } = await supabase
        .from("rate_limits")
        .select("identifier, action, count, window_start")
        .gte("window_start", windowStart)
        .gte("count", 5)
        .limit(50);

      if (rlRows && rlRows.length > 0) {
        for (const row of rlRows) {
          log("Brute force detected", row);
          await insertIfNew("brute_force_attempt", "critical", {
            ipAddress: row.identifier,
            details: { action: row.action, count: row.count, window_start: row.window_start },
          });
        }
      }
    }

    // 2. OFF-HOURS ACCESS — audit_logs login between 00-05h BRT (UTC-3 = 03-08 UTC)
    {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: auditRows } = await supabase
        .from("audit_logs")
        .select("user_id, action, created_at")
        .in("action", ["INSERT", "PLAN_CHANGE"])
        .eq("table_name", "user_roles")
        .gte("created_at", since);

      if (auditRows) {
        for (const row of auditRows) {
          if (!row.created_at) continue;
          const utcHour = new Date(row.created_at).getUTCHours();
          // BRT = UTC-3, so 00-05 BRT = 03-08 UTC
          if (utcHour >= 3 && utcHour < 8) {
            log("Off-hours access detected", { user_id: row.user_id, hour: utcHour - 3 });
            await insertIfNew("off_hours_access", "medium", {
              userId: row.user_id,
              details: { user_id: row.user_id, hour_brt: utcHour - 3, action: row.action },
            });
          }
        }
      }
    }

    // 3. PROPOSAL VOLUME SPIKE — >50 proposals per store in 1 hour (batch query)
    {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentProposals } = await supabase
        .from("proposals")
        .select("store_id")
        .gte("created_at", oneHourAgo);

      if (recentProposals && recentProposals.length > 0) {
        // Contar por store_id em memória
        const countByStore = new Map<string, number>();
        for (const p of recentProposals) {
          countByStore.set(p.store_id, (countByStore.get(p.store_id) || 0) + 1);
        }
        for (const [storeId, count] of countByStore) {
          if (count > 50) {
            log("Proposal volume spike", { store_id: storeId, count });
            await insertIfNew("proposal_volume_spike", "high", {
              storeId,
              details: { store_id: storeId, count },
            });
          }
        }
      }
    }

    // 4. MULTIPLE IPs — same action from many distinct identifiers in rate_limits (last 1h)
    {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: rlAll } = await supabase
        .from("rate_limits")
        .select("identifier, action")
        .gte("window_start", oneHourAgo);

      if (rlAll) {
        // Group by action, count distinct identifiers
        const actionMap = new Map<string, Set<string>>();
        for (const r of rlAll) {
          if (!actionMap.has(r.action)) actionMap.set(r.action, new Set());
          actionMap.get(r.action)!.add(r.identifier);
        }
        for (const [action, ips] of actionMap) {
          if (ips.size > 3) {
            log("Multiple IP access", { action, ip_count: ips.size });
            await insertIfNew("multiple_ip_access", "high", {
              details: { action, ip_count: ips.size, ips: [...ips].slice(0, 10) },
            });
          }
        }
      }
    }

    // 5. CROSS-TENANT ATTEMPT — RLS_VIOLATION in audit_logs (last 15 min)
    {
      const fifteenMin = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: rlsRows } = await supabase
        .from("audit_logs")
        .select("user_id, record_id, table_name, created_at, ip_address")
        .eq("action", "RLS_VIOLATION")
        .gte("created_at", fifteenMin);

      if (rlsRows && rlsRows.length > 0) {
        for (const row of rlsRows) {
          log("Cross-tenant attempt", row);
          await insertIfNew("cross_tenant_attempt", "critical", {
            userId: row.user_id,
            ipAddress: row.ip_address,
            details: { table: row.table_name, record_id: row.record_id },
          });
        }
      }
    }

    log("Scan complete", { detected, inserted });

    return new Response(JSON.stringify({ detected, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

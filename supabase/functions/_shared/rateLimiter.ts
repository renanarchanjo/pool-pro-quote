export async function checkRateLimit(
  supabase: any,
  identifier: string,
  action: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(
    Date.now() - windowMinutes * 60 * 1000
  ).toISOString();

  // Atomic upsert: increment count in a single operation to prevent TOCTOU race conditions.
  // First, clean up expired windows for this identifier+action.
  await supabase
    .from("rate_limits")
    .delete()
    .eq("identifier", identifier)
    .eq("action", action)
    .lt("window_start", windowStart);

  // Try to increment an existing valid window
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count")
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("window_start", windowStart)
    .single();

  if (!existing) {
    // No active window — create a new one
    await supabase.from("rate_limits").insert({
      identifier,
      action,
      count: 1,
      window_start: new Date().toISOString(),
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Use RPC or direct update with the current count as a condition
  // to prevent concurrent requests from exceeding the limit
  const { data: updated, error: updateError } = await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("window_start", windowStart)
    .lte("count", maxRequests - 1)
    .select("count")
    .single();

  if (updateError || !updated) {
    // If update failed, the count was already at the limit (concurrent request)
    return { allowed: false, remaining: 0 };
  }

  return {
    allowed: true,
    remaining: maxRequests - updated.count,
  };
}

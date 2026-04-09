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

  const { data, error } = await supabase
    .from("rate_limits")
    .select("count, window_start")
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("window_start", windowStart)
    .single();

  if (error || !data) {
    await supabase.from("rate_limits").insert({
      identifier,
      action,
      count: 1,
      window_start: new Date().toISOString(),
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (data.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await supabase
    .from("rate_limits")
    .update({ count: data.count + 1 })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("window_start", windowStart);

  return {
    allowed: true,
    remaining: maxRequests - data.count - 1,
  };
}

/**
 * Native-feeling haptic feedback for mobile web/PWA.
 * Uses Vibration API (Android/Chrome). iOS Safari ignores silently.
 */
type Pattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 22,
  selection: 4,
  success: [10, 40, 18],
  warning: [18, 60, 18],
  error: [22, 40, 22, 40, 22],
};

let lastFire = 0;

export function haptic(pattern: Pattern = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  // Throttle to avoid spam (50ms minimum between calls)
  const now = Date.now();
  if (now - lastFire < 50) return;
  lastFire = now;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* noop */
  }
}

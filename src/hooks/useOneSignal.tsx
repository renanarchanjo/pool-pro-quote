import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "5f4c1578-23d5-49ff-b055-49a63c4c3074";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void>>;
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const [permission, setPermission] = useState<"default" | "granted" | "denied">("default");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const initAttempted = useRef(false);

  // Load SDK with timeout
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    // Check if already loaded
    if (window.OneSignal?.Notifications) {
      setInitialized(true);
      const perm = window.OneSignal.Notifications.permission;
      setPermission(perm ? "granted" : "default");
      return;
    }

    // Skip in non-HTTPS environments (OneSignal requires HTTPS)
    if (typeof window !== "undefined" && window.location.protocol !== "https:") {
      console.warn("OneSignal requires HTTPS, skipping init");
      return;
    }

    const timeout = setTimeout(() => {
      if (!initialized) {
        console.warn("OneSignal SDK load timeout (10s)");
        setInitialized(false);
      }
    }, 10000);

    const existingScript = document.getElementById("onesignal-sdk");
    if (existingScript) {
      // Script tag exists but may not have loaded yet
      clearTimeout(timeout);
      setInitialized(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "onesignal-sdk";
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;

    script.onerror = () => {
      clearTimeout(timeout);
      console.error("Failed to load OneSignal SDK");
    };

    script.onload = () => {
      clearTimeout(timeout);
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            notifyButton: { enable: false },
          });
          setInitialized(true);

          const perm = OneSignal.Notifications?.permission;
          if (perm !== undefined) {
            setPermission(perm ? "granted" : "default");
          }
        } catch (err) {
          console.error("OneSignal init error:", err);
        }
      });
    };

    document.head.appendChild(script);

    return () => clearTimeout(timeout);
  }, []);

  // Sync subscription to DB
  const syncSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      // Set external user id for targeting
      try {
        await OneSignal.login(session.user.id);
      } catch (e) {
        console.warn("OneSignal login failed:", e);
      }

      const subscriptionId = OneSignal.User?.PushSubscription?.id;

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          onesignal_subscription_id: subscriptionId || null,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.error("Error syncing push subscription:", err);
    }
  }, []);

  const ativarNotificacoes = useCallback(async () => {
    setLoading(true);

    // Safety timeout - never leave button spinning forever
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 15000);

    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal?.Notifications) {
        throw new Error("OneSignal SDK não carregou. Verifique sua conexão.");
      }

      await OneSignal.Notifications.requestPermission();
      const granted = OneSignal.Notifications.permission;
      setPermission(granted ? "granted" : "denied");

      if (granted) {
        await syncSubscription();
      }
    } catch (err) {
      console.error("Error requesting push permission:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [syncSubscription]);

  // Auto-sync when initialized + granted
  useEffect(() => {
    if (initialized && permission === "granted") {
      syncSubscription();
    }
  }, [initialized, permission, syncSubscription]);

  return { permission, loading, ativarNotificacoes, initialized };
}

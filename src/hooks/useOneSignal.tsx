import { useEffect, useState, useCallback } from "react";
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

  // Load SDK
  useEffect(() => {
    if (document.getElementById("onesignal-sdk")) {
      setInitialized(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "onesignal-sdk";
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          notifyButton: { enable: false },
        });
        setInitialized(true);

        // Check current permission
        const perm = OneSignal.Notifications?.permission;
        if (perm !== undefined) {
          setPermission(perm ? "granted" : "default");
        }
      });
    };
    document.head.appendChild(script);
  }, []);

  // Sync subscription to DB when permission changes
  const syncSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      // Set external user id for targeting
      await OneSignal.login(session.user.id);

      const subscriptionId = OneSignal.User?.PushSubscription?.id;
      
      // Upsert push_subscriptions
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
    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) throw new Error("OneSignal not loaded");

      await OneSignal.Notifications.requestPermission();
      const granted = OneSignal.Notifications.permission;
      setPermission(granted ? "granted" : "denied");

      if (granted) {
        await syncSubscription();
      }
    } catch (err) {
      console.error("Error requesting push permission:", err);
    } finally {
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

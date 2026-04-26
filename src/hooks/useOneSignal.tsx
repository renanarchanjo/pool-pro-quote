import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void>>;
    OneSignal?: any;
  }
}

type PermissionState = "default" | "granted" | "denied";
type PushSupportState = "supported" | "unsupported" | "unknown";

export function useOneSignal() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [support, setSupport] = useState<PushSupportState>("unknown");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [hasSavedSubscription, setHasSavedSubscription] = useState(false);
  const initAttempted = useRef(false);

  const loadSavedSubscription = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data } = await supabase
        .from("push_subscriptions")
        .select("enabled, onesignal_subscription_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const active = Boolean(data?.enabled && data?.onesignal_subscription_id);
      setHasSavedSubscription(active);
      return active;
    } catch (err) {
      console.error("Error loading saved push subscription:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Push notifications are PWA-only — must be installed on home screen
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (!isStandalone) {
      setSupport("unsupported");
      const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setStatusMessage(
        isApple
          ? "Para receber notificações, instale o app na tela inicial do iPhone."
          : "Para receber notificações, instale o app (Adicionar à tela inicial)."
      );
      return;
    }

    const isSecure = window.isSecureContext && window.location.protocol === "https:";
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !isSecure) {
      setSupport("unsupported");
      setStatusMessage("Este dispositivo/navegador não suporta notificações web neste contexto.");
      return;
    }

    setSupport("supported");
    setPermission(Notification.permission === "default" ? "default" : Notification.permission === "granted" ? "granted" : "denied");
    void loadSavedSubscription();

    if (initAttempted.current) return;
    initAttempted.current = true;

    setStatusMessage("Inicializando notificações...");

    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
          notificationClickHandlerMatch: "origin",
          notificationClickHandlerAction: "focus",
        });
      } catch (err: any) {
        if (err?.message !== "SDK already initialized") {
          console.error("OneSignal init error:", err);
          setStatusMessage("Falha ao inicializar notificações. Recarregue a página.");
          return;
        }
      }
      setInitialized(true);
      setStatusMessage("");
      try {
        const perm = OneSignal.Notifications?.permission;
        if (perm !== undefined) {
          setPermission(perm ? "granted" : Notification.permission === "denied" ? "denied" : "default");
        }
      } catch (_) {}
    });
  }, [loadSavedSubscription]);

  const syncSubscription = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const OneSignal = window.OneSignal;
      if (!OneSignal) return false;

      try {
        await OneSignal.login(session.user.id);
      } catch (e) {
        console.warn("OneSignal login failed:", e);
      }

      let subscriptionId: string | null = null;
      let optedIn = false;
      for (let i = 0; i < 8; i++) {
        subscriptionId = OneSignal.User?.PushSubscription?.id ?? null;
        optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);
        if (subscriptionId && optedIn) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          onesignal_subscription_id: subscriptionId,
          enabled: optedIn,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      setHasSavedSubscription(Boolean(subscriptionId && optedIn));
      return optedIn;
    } catch (err) {
      console.error("Error syncing push subscription:", err);
      return false;
    }
  }, []);

  const ativarNotificacoes = useCallback(async () => {
    if (support === "unsupported") {
      return { ok: false, reason: statusMessage || "unsupported" };
    }

    if (hasSavedSubscription) {
      setPermission("granted");
      setStatusMessage("Notificações já estão ativas neste dispositivo.");
      return { ok: true, reason: "already_active" };
    }

    if (!initialized || !window.OneSignal?.Notifications) {
      return { ok: false, reason: "sdk_not_ready" };
    }

    setLoading(true);
    setStatusMessage("Solicitando permissão de notificações...");

    const safetyTimeout = window.setTimeout(async () => {
      const saved = await loadSavedSubscription();
      if (saved) {
        setPermission("granted");
        setStatusMessage("Notificações já estão ativas neste dispositivo.");
      } else {
        setStatusMessage("A solicitação demorou demais. Tente novamente.");
      }
      setLoading(false);
    }, 15000);

    try {
      const OneSignal = window.OneSignal;

      await OneSignal.Notifications.requestPermission();

      const browserPermission = Notification.permission;
      const granted = browserPermission === "granted";
      setPermission(granted ? "granted" : browserPermission === "denied" ? "denied" : "default");

      if (!granted) {
        const saved = await loadSavedSubscription();
        if (saved) {
          setPermission("granted");
          setStatusMessage("Notificações já estão ativas neste dispositivo.");
          return { ok: true, reason: "already_active" };
        }

        setStatusMessage(browserPermission === "denied" ? "Permissão bloqueada no navegador." : "Permissão não concedida.");
        return { ok: false, reason: browserPermission === "denied" ? "blocked" : "not_granted" };
      }

      setStatusMessage("Conectando seu dispositivo às notificações...");
      const synced = await syncSubscription();

      if (!synced) {
        const saved = await loadSavedSubscription();
        if (saved) {
          setPermission("granted");
          setStatusMessage("Notificações já estão ativas neste dispositivo.");
          return { ok: true, reason: "already_active" };
        }

        setStatusMessage("Permissão concedida, mas a inscrição do dispositivo ainda não foi concluída.");
        return { ok: false, reason: "subscription_pending" };
      }

      setPermission("granted");
      setStatusMessage("Notificações ativadas com sucesso!");
      return { ok: true };
    } catch (err) {
      console.error("Error requesting push permission:", err);
      const saved = await loadSavedSubscription();
      if (saved) {
        setPermission("granted");
        setStatusMessage("Notificações já estão ativas neste dispositivo.");
        return { ok: true, reason: "already_active" };
      }

      setStatusMessage("Erro ao ativar notificações neste dispositivo.");
      return { ok: false, reason: "request_failed" };
    } finally {
      window.clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [hasSavedSubscription, initialized, loadSavedSubscription, statusMessage, support, syncSubscription]);

  const syncDone = useRef(false);
  useEffect(() => {
    if (syncDone.current) return;
    if (initialized && (permission === "granted" || hasSavedSubscription)) {
      syncDone.current = true;
      void syncSubscription();
    }
  }, [initialized, permission, hasSavedSubscription, syncSubscription]);

  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);
  return {
    permission,
    loading,
    ativarNotificacoes,
    initialized,
    support,
    statusMessage,
    isStandalonePwa: isStandalone,
    hasSavedSubscription,
  };
}

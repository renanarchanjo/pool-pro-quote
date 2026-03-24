import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "5f4c1578-23d5-49ff-b055-49a63c4c3074";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void>>;
    OneSignal?: any;
  }
}

type PermissionState = "default" | "granted" | "denied";
type PushSupportState = "supported" | "unsupported" | "unknown";

const isStandalonePwa = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
};

const isSecureContextForPush = () => {
  if (typeof window === "undefined") return false;
  return window.isSecureContext && window.location.protocol === "https:";
};

const isAppleMobile = () => {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export function useOneSignal() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [support, setSupport] = useState<PushSupportState>("unknown");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const initAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !isSecureContextForPush()) {
      setSupport("unsupported");
      setStatusMessage("Este dispositivo/navegador não suporta notificações web neste contexto.");
      return;
    }

    if (isAppleMobile() && !isStandalonePwa()) {
      setSupport("unsupported");
      setStatusMessage("No iPhone, instale o app na tela inicial para ativar notificações push.");
      return;
    }

    setSupport("supported");
    setPermission(Notification.permission === "default" ? "default" : Notification.permission === "granted" ? "granted" : "denied");

    if (initAttempted.current) return;
    initAttempted.current = true;

    if (window.OneSignal?.Notifications) {
      setInitialized(true);
      return;
    }

    const existingScript = document.getElementById("onesignal-sdk");
    if (existingScript) {
      setStatusMessage("Finalizando carregamento do serviço de notificações...");
      return;
    }

    setStatusMessage("Carregando serviço de notificações...");

    const timeout = window.setTimeout(() => {
      setLoading(false);
      setStatusMessage("O carregamento das notificações expirou. Tente novamente.");
    }, 12000);

    const script = document.createElement("script");
    script.id = "onesignal-sdk";
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;

    script.onerror = () => {
      window.clearTimeout(timeout);
      setLoading(false);
      setSupport("unsupported");
      setStatusMessage("Não foi possível carregar o serviço de notificações.");
      console.error("Failed to load OneSignal SDK");
    };

    script.onload = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: false,
          });
          window.clearTimeout(timeout);
          setInitialized(true);
          setStatusMessage("");
          const perm = OneSignal.Notifications?.permission;
          if (perm !== undefined) {
            setPermission(perm ? "granted" : Notification.permission === "denied" ? "denied" : "default");
          }
        } catch (err) {
          window.clearTimeout(timeout);
          setLoading(false);
          setStatusMessage("Falha ao inicializar notificações neste dispositivo.");
          console.error("OneSignal init error:", err);
        }
      });
    };

    document.head.appendChild(script);

    return () => window.clearTimeout(timeout);
  }, []);

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

      const subscriptionId = OneSignal.User?.PushSubscription?.id ?? null;
      const optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          onesignal_subscription_id: subscriptionId,
          enabled: optedIn,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

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

    if (!initialized || !window.OneSignal?.Notifications) {
      return { ok: false, reason: "sdk_not_ready" };
    }

    setLoading(true);
    setStatusMessage("Solicitando permissão de notificações...");

    const safetyTimeout = window.setTimeout(() => {
      setLoading(false);
      setStatusMessage("A solicitação demorou demais. Tente novamente.");
    }, 15000);

    try {
      const OneSignal = window.OneSignal;

      await OneSignal.Notifications.requestPermission();

      const browserPermission = Notification.permission;
      const granted = browserPermission === "granted";
      setPermission(granted ? "granted" : browserPermission === "denied" ? "denied" : "default");

      if (!granted) {
        setStatusMessage(browserPermission === "denied" ? "Permissão bloqueada no navegador." : "Permissão não concedida.");
        return { ok: false, reason: browserPermission === "denied" ? "blocked" : "not_granted" };
      }

      setStatusMessage("Conectando seu dispositivo às notificações...");
      const synced = await syncSubscription();

      if (!synced) {
        setStatusMessage("Permissão concedida, mas a inscrição do dispositivo ainda não foi concluída.");
        return { ok: false, reason: "subscription_pending" };
      }

      setStatusMessage("Notificações ativadas com sucesso!");
      return { ok: true };
    } catch (err) {
      console.error("Error requesting push permission:", err);
      setStatusMessage("Erro ao ativar notificações neste dispositivo.");
      return { ok: false, reason: "request_failed" };
    } finally {
      window.clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [initialized, statusMessage, support, syncSubscription]);

  useEffect(() => {
    if (initialized && permission === "granted") {
      syncSubscription();
    }
  }, [initialized, permission, syncSubscription]);

  return { permission, loading, ativarNotificacoes, initialized, support, statusMessage, isStandalonePwa: isStandalonePwa() };
}

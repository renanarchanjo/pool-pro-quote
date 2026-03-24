import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOneSignal } from "@/hooks/useOneSignal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PushNotificationButton = () => {
  const {
    permission,
    loading,
    ativarNotificacoes,
    initialized,
    support,
    statusMessage,
    isStandalonePwa,
    hasSavedSubscription,
  } = useOneSignal();
  const [testLoading, setTestLoading] = useState(false);

  const isActive = permission === "granted" || hasSavedSubscription;

  const handleClick = async () => {
    if (support === "unsupported") {
      toast.error(statusMessage || "Este dispositivo não suporta push neste contexto.");
      return;
    }

    if (isActive) {
      toast.info("Notificações já estão ativas!");
      return;
    }

    if (!initialized) {
      toast.info(statusMessage || "Aguarde o carregamento do serviço de notificações.");
      return;
    }

    if (permission === "denied") {
      toast.error("Notificações foram bloqueadas no navegador. Desbloqueie nas configurações.");
      return;
    }

    const result = await ativarNotificacoes();

    if (result?.ok) {
      toast.success("Notificações ativadas com sucesso! 🔔");
      return;
    }

    if (result?.reason === "subscription_pending") {
      toast.warning("Permissão concedida, mas o dispositivo ainda está finalizando a inscrição. Tente o teste em alguns segundos.");
      return;
    }

    if (result?.reason === "sdk_not_ready") {
      toast.info("Serviço de notificações ainda carregando. Tente novamente em alguns segundos.");
      return;
    }

    if (result?.reason === "blocked") {
      toast.error("Permissão bloqueada no navegador.");
      return;
    }

    toast.error(statusMessage || "Não foi possível ativar as notificações.");
  };

  const handleTestPush = async () => {
    setTestLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.functions.invoke("notification-engine", {
        body: { tipo: "lead_recebido", userId: user.id, bypassCooldown: true, bypassDailyLimit: true, bypassDeduplication: true },
      });

      if (error) throw error;

      if (data?.sent) {
        toast.success("🔔 Notificação de teste enviada! Verifique seu dispositivo.");
      } else if (data?.action === "deduplicated") {
        toast.info("Notificação já enviada recentemente.");
      } else if (data?.action === "throttled") {
        toast.info("Limite anti-spam atingido temporariamente.");
      } else {
        toast.warning("Notificação não enviada. O dispositivo pode ainda não ter concluído a inscrição push.");
      }
    } catch (err: any) {
      console.error("Test push error:", err);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setTestLoading(false);
    }
  };

  const icon = isActive ? (
    <BellRing className="w-4 h-4 mr-2" />
  ) : permission === "denied" ? (
    <BellOff className="w-4 h-4 mr-2" />
  ) : (
    <Bell className="w-4 h-4 mr-2" />
  );

  const label = isActive
    ? "Notificações ativas"
    : permission === "denied"
      ? "Notificações bloqueadas"
      : "Ativar notificações PWA";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleClick}
          disabled={loading || support === "unsupported"}
          variant={isActive ? "outline" : "default"}
          size="sm"
          className="shrink-0 min-h-[44px]"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : icon}
          {label}
        </Button>

        {isActive && (
          <Button
            onClick={handleTestPush}
            disabled={testLoading}
            variant="outline"
            size="sm"
            className="shrink-0 min-h-[44px]"
          >
            {testLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Testar Push
          </Button>
        )}
      </div>

      {(statusMessage || (support === "unsupported" && !isStandalonePwa)) && (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[34rem]">
          {statusMessage}
        </p>
      )}
    </div>
  );
};

export default PushNotificationButton;

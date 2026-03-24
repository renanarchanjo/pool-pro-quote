import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOneSignal } from "@/hooks/useOneSignal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PushNotificationButton = () => {
  const { permission, loading, ativarNotificacoes } = useOneSignal();
  const [testLoading, setTestLoading] = useState(false);

  const handleClick = async () => {
    if (permission === "granted") {
      toast.info("Notificações já estão ativas!");
      return;
    }
    if (permission === "denied") {
      toast.error("Notificações foram bloqueadas no navegador. Desbloqueie nas configurações.");
      return;
    }
    await ativarNotificacoes();
    toast.success("Notificações ativadas com sucesso! 🔔");
  };

  const handleTestPush = async () => {
    setTestLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.functions.invoke("notification-engine", {
        body: { tipo: "lead_recebido", userId: user.id },
      });

      if (error) throw error;

      if (data?.action === "deduplicated") {
        toast.info("Notificação já enviada recentemente (deduplicação ativa)");
      } else if (data?.action === "throttled") {
        toast.info("Limite anti-spam atingido. Tente novamente em 1 hora.");
      } else if (data?.sent) {
        toast.success("🔔 Notificação de teste enviada! Verifique seu dispositivo.");
      } else {
        toast.warning("Notificação não enviada. Verifique se ativou as notificações.");
      }
    } catch (err: any) {
      console.error("Test push error:", err);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setTestLoading(false);
    }
  };

  const icon = permission === "granted" ? (
    <BellRing className="w-4 h-4 mr-2" />
  ) : permission === "denied" ? (
    <BellOff className="w-4 h-4 mr-2" />
  ) : (
    <Bell className="w-4 h-4 mr-2" />
  );

  const label = permission === "granted"
    ? "Notificações ativas"
    : permission === "denied"
    ? "Notificações bloqueadas"
    : "Ativar notificações";

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleClick}
        disabled={loading || permission === "denied"}
        variant={permission === "granted" ? "outline" : "default"}
        size="sm"
        className="shrink-0"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : icon}
        {label}
      </Button>

      {permission === "granted" && (
        <Button
          onClick={handleTestPush}
          disabled={testLoading}
          variant="outline"
          size="sm"
          className="shrink-0"
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
  );
};

export default PushNotificationButton;

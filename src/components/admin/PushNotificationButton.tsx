import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";

const PushNotificationButton = () => {
  const { permission, loading, ativarNotificacoes } = useOneSignal();

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
  );
};

export default PushNotificationButton;

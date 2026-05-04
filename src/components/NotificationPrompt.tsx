import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { useOneSignal } from "@/hooks/useOneSignal";
import { IphoneInstallGuide } from "./IphoneInstallGuide";

export const NotificationPrompt = () => {
  const {
    permission,
    support,
    ativarNotificacoes,
    loading,
    isStandalonePwa,
    hasSavedSubscription,
  } = useOneSignal();

  const [dismissed, setDismissed] = useState(false);
  const [showIphoneGuide, setShowIphoneGuide] = useState(false);

  const isIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("notif_prompt_dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notif_prompt_dismissed", "1");
  };

  if (dismissed) return null;
  if (permission === "granted" || hasSavedSubscription) return null;
  if (permission === "denied") return null;

  // iPhone not in standalone mode — show install guide prompt
  if (isIphone && !isStandalonePwa) {
    return (
      <>
        {showIphoneGuide && (
          <IphoneInstallGuide onClose={() => setShowIphoneGuide(false)} />
        )}
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in md:left-auto md:right-6 md:max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <BellOff className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-sm font-semibold text-foreground">
                Ative as notificações
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Para receber alertas de leads no iPhone, instale o app na tela inicial primeiro.
              </p>
              <button
                onClick={() => setShowIphoneGuide(true)}
                className="text-primary text-xs font-medium mt-2"
              >
                Como instalar →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (support === "unsupported") return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in md:left-auto md:right-6 md:max-w-sm">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            Receba alertas de novos leads
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ative as notificações e seja avisado na hora que um lead chegar.
          </p>
          <button
            onClick={async () => {
              try {
                await ativarNotificacoes();
              } finally {
                handleDismiss();
              }
            }}
            disabled={loading}
            className="mt-2 text-xs font-semibold text-primary-foreground bg-primary px-4 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Ativando..." : "Ativar notificações"}
          </button>
        </div>
      </div>
    </div>
  );
};

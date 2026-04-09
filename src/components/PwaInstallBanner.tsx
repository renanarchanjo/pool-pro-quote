import { useState } from "react";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const PwaInstallBanner = () => {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, not installable, or user dismissed
  if (isInstalled || !isInstallable || dismissed) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  };

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+12px)] md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-sm z-[55] animate-fade-in">
      <div className="flex items-center gap-3 bg-background border border-border rounded-2xl p-3 shadow-lg shadow-black/10">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Instalar SimulaPool</p>
          <p className="text-xs text-muted-foreground mt-0.5">Acesse como app direto da tela inicial</p>
        </div>
        <button
          onClick={handleInstall}
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shrink-0 active:scale-95 transition-transform"
        >
          Instalar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;

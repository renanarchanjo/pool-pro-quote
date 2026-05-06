import { useState } from "react";
import { Share, Plus, X, Smartphone, MoreVertical, Apple, Monitor } from "lucide-react";

interface Props {
  onClose: () => void;
}

type Tab = "ios" | "android" | "desktop";

export const PwaInstallGuide = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("ios");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 pb-8 md:pb-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Instalar SimulaPool</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Instale o app na tela inicial para acesso rápido, notificações e modo offline.
        </p>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg mb-5">
          <button
            onClick={() => setTab("ios")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-semibold transition-all ${
              tab === "ios" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Apple className="w-3.5 h-3.5" /> iPhone
          </button>
          <button
            onClick={() => setTab("android")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-semibold transition-all ${
              tab === "android" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Android
          </button>
          <button
            onClick={() => setTab("desktop")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-semibold transition-all ${
              tab === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
        </div>

        {tab === "ios" && (
          <div className="space-y-4">
            <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Use o navegador <strong>Safari</strong> (não funciona no Chrome do iOS).
            </div>
            <Step n={1} title="Toque no botão compartilhar" desc="Ícone na barra inferior do Safari">
              <div className="mt-2 flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Share className="w-5 h-5 text-primary" />
              </div>
            </Step>
            <Step n={2} title='Selecione "Adicionar à Tela de Início"' desc="Role o menu de compartilhamento para baixo">
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-xs">
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-foreground">Adicionar à Tela de Início</span>
              </div>
            </Step>
            <Step n={3} title='Confirme em "Adicionar"' desc="O app aparecerá na sua tela inicial." />
          </div>
        )}

        {tab === "android" && (
          <div className="space-y-4">
            <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Use o <strong>Google Chrome</strong> ou <strong>Edge</strong> no Android.
            </div>
            <Step n={1} title="Toque nos três pontinhos" desc="Menu no canto superior direito do navegador">
              <div className="mt-2 flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <MoreVertical className="w-5 h-5 text-primary" />
              </div>
            </Step>
            <Step
              n={2}
              title='Toque em "Instalar app" ou "Adicionar à tela inicial"'
              desc="A opção pode aparecer com ícone de download/+"
            >
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-xs">
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-foreground">Instalar app</span>
              </div>
            </Step>
            <Step n={3} title='Confirme em "Instalar"' desc="Pronto! O ícone do SimulaPool ficará na sua tela inicial." />
          </div>
        )}

        {tab === "desktop" && (
          <div className="space-y-4">
            <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Funciona no <strong>Chrome</strong>, <strong>Edge</strong> ou <strong>Brave</strong>.
            </div>
            <Step n={1} title="Procure o ícone de instalação" desc="Aparece na barra de endereço, ao lado da URL">
              <div className="mt-2 flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Plus className="w-5 h-5 text-primary" />
              </div>
            </Step>
            <Step n={2} title='Clique em "Instalar"' desc="Uma janela aparecerá pedindo confirmação." />
            <Step n={3} title="Abra como app independente" desc="Será aberto em janela própria, como um aplicativo nativo." />
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 text-sm font-semibold text-primary-foreground bg-primary py-3 rounded-xl hover:opacity-90 transition"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

const Step = ({ n, title, desc, children }: { n: number; title: string; desc: string; children?: React.ReactNode }) => (
  <div className="flex gap-3">
    <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[13px] font-bold">
      {n}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      {children}
    </div>
  </div>
);

export default PwaInstallGuide;

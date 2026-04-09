import { Share, Plus, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export const IphoneInstallGuide = ({ onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          <span />
        </div>

        <h2 className="text-lg font-bold text-foreground text-center mb-6">
          Instalar no iPhone
        </h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Toque no botão compartilhar
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ícone de compartilhar na barra inferior do Safari
              </p>
              <div className="mt-2 flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Share className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Selecione &quot;Adicionar à Tela de Início&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Role para baixo no menu de compartilhamento
              </p>
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-foreground text-xs">Adicionar à Tela de Início</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Confirme tocando em &quot;Adicionar&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O app aparecerá na sua tela inicial e você poderá ativar notificações
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 text-sm font-semibold text-primary-foreground bg-primary py-3 rounded-xl hover:opacity-90 transition"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

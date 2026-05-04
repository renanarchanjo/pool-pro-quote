import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Palette,
  Layers,
  Package,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

interface Props {
  userId: string;
  storeName?: string | null;
}

const STORAGE_KEY = "owner_onboarding_seen_v1";

const steps = [
  {
    icon: Building2,
    title: "Complete os dados da sua loja",
    description:
      "Acesse Minha Conta e preencha CNPJ, endereço, telefone e e-mail. Esses dados serão usados automaticamente em propostas e contratos.",
    action: { label: "Ir para Minha Conta", path: "/admin/perfil" },
  },
  {
    icon: Palette,
    title: "Personalize a identidade visual",
    description:
      "Ainda em Minha Conta, envie seu logo e defina cores. Tudo será refletido nas propostas geradas para o cliente.",
    action: { label: "Ir para Minha Conta", path: "/admin/perfil" },
  },
  {
    icon: Layers,
    title: "Cadastre Marcas e Categorias",
    description:
      "Organize seu catálogo criando as marcas e categorias dos seus produtos antes de cadastrar os modelos.",
    action: { label: "Cadastrar Marcas", path: "/admin/marcas" },
  },
  {
    icon: Package,
    title: "Adicione seus Modelos e Opcionais",
    description:
      "Cadastre os modelos com preço, medidas, itens inclusos e opcionais. Eles ficarão disponíveis no simulador.",
    action: { label: "Cadastrar Modelos", path: "/admin/modelos" },
  },
  {
    icon: Users,
    title: "Convide sua equipe",
    description:
      "Adicione vendedores em Minha Equipe e configure comissões. Eles poderão acompanhar leads e gerar propostas.",
    action: { label: "Gerenciar Equipe", path: "/admin/equipe" },
  },
  {
    icon: Sparkles,
    title: "Tudo pronto!",
    description:
      "Comece a gerar propostas e acompanhe seus leads no Dashboard. Você pode revisar este guia a qualquer momento limpando o cache.",
    action: { label: "Ir para o Dashboard", path: "/admin" },
  },
];

const OwnerOnboardingModal = ({ userId, storeName }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const key = `${STORAGE_KEY}:${userId}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      // small delay to avoid clashing with initial loaders
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [userId]);

  const close = () => {
    if (userId) localStorage.setItem(`${STORAGE_KEY}:${userId}`, "1");
    setOpen(false);
  };

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const handleAction = () => {
    navigate(current.action.path);
    if (isLast) close();
    else setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
              Bem-vindo{storeName ? `, ${storeName}` : ""}
            </p>
            <DialogTitle className="text-[20px] font-bold tracking-tight">
              Como começar a usar a plataforma
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Siga estas etapas rápidas para deixar tudo configurado.
            </DialogDescription>
          </DialogHeader>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                  Etapa {step + 1} de {steps.length}
                </span>
                {isLast && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Final
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-bold text-foreground mb-1.5">
                {current.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={close}>
              Pular guia
            </Button>
            <Button size="sm" onClick={handleAction}>
              {isLast ? "Concluir" : current.action.label}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerOnboardingModal;

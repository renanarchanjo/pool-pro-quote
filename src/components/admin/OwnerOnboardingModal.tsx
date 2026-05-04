import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Props {
  userId: string;
  storeId?: string;
  storeName?: string | null;
}

const PROGRESS_KEY = "owner_onboarding_progress_v1";
const COMPLETED_KEY = "owner_onboarding_completed_v1";

type StepCheck = (storeId: string) => Promise<{ done: boolean; hint?: string }>;

interface Step {
  icon: any;
  title: string;
  description: string;
  action: { label: string; path: string };
  optional?: boolean;
  check: StepCheck;
}

const steps: Step[] = [
  {
    icon: Building2,
    title: "Complete os dados da sua loja",
    description:
      "Preencha CNPJ, endereço, CEP, telefone e e-mail em Minha Conta. Esses dados serão usados em propostas e contratos.",
    action: { label: "Ir para Minha Conta", path: "/admin/perfil" },
    check: async (storeId) => {
      const { data } = await supabase
        .from("stores")
        .select("cnpj, address, cep, company_email, whatsapp")
        .eq("id", storeId)
        .maybeSingle();
      const ok = !!(data?.cnpj && data?.address && data?.cep && (data?.whatsapp || data?.company_email));
      return {
        done: ok,
        hint: ok ? undefined : "Faltam dados obrigatórios (CNPJ, endereço, CEP e telefone/e-mail).",
      };
    },
  },
  {
    icon: Palette,
    title: "Personalize a identidade visual",
    description:
      "Ainda em Minha Conta, envie seu logo. Ele aparecerá nas propostas e nos materiais enviados ao cliente.",
    action: { label: "Enviar logo", path: "/admin/perfil" },
    check: async (storeId) => {
      const { data } = await supabase
        .from("store_settings")
        .select("logo_url")
        .eq("store_id", storeId)
        .maybeSingle();
      return { done: !!data?.logo_url, hint: "Envie o logo da sua loja em Minha Conta." };
    },
  },
  {
    icon: Layers,
    title: "Cadastre Marcas e Categorias",
    description:
      "Organize seu catálogo criando ao menos uma marca e categoria antes de cadastrar modelos.",
    action: { label: "Cadastrar Marcas", path: "/admin/marcas" },
    check: async (storeId) => {
      const { count } = await supabase
        .from("brands")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);
      return { done: (count || 0) > 0, hint: "Cadastre pelo menos uma marca." };
    },
  },
  {
    icon: Package,
    title: "Adicione seus Modelos",
    description:
      "Cadastre os modelos com preço, medidas, itens inclusos e opcionais. Eles ficarão disponíveis no simulador.",
    action: { label: "Cadastrar Modelos", path: "/admin/modelos" },
    check: async (storeId) => {
      const { count } = await supabase
        .from("pool_models")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);
      return { done: (count || 0) > 0, hint: "Cadastre pelo menos um modelo." };
    },
  },
  {
    icon: Users,
    title: "Convide sua equipe (opcional)",
    description:
      "Adicione vendedores em Minha Equipe e configure comissões. Você pode pular esta etapa e voltar depois.",
    action: { label: "Gerenciar Equipe", path: "/admin/equipe" },
    optional: true,
    check: async () => ({ done: true }),
  },
  {
    icon: Sparkles,
    title: "Tudo pronto!",
    description:
      "Sua loja está configurada. Comece a gerar propostas e acompanhe os leads no Dashboard.",
    action: { label: "Ir para o Dashboard", path: "/admin" },
    check: async () => ({ done: true }),
  },
];

const OwnerOnboardingModal = ({ userId, storeId, storeName }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progressKey = `${PROGRESS_KEY}:${userId}`;
  const completedKey = `${COMPLETED_KEY}:${userId}`;

  // Auto-resume / open on first login
  useEffect(() => {
    if (!userId || !storeId) return;
    if (localStorage.getItem(completedKey)) return;
    const saved = parseInt(localStorage.getItem(progressKey) || "0", 10);
    setStep(Number.isFinite(saved) ? Math.min(Math.max(saved, 0), steps.length - 1) : 0);
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [userId, storeId, completedKey, progressKey]);

  // Persist current step
  useEffect(() => {
    if (userId) localStorage.setItem(progressKey, String(step));
  }, [step, userId, progressKey]);

  const finish = useCallback(() => {
    if (userId) localStorage.setItem(completedKey, "1");
    setOpen(false);
  }, [userId, completedKey]);

  const handleConfirm = async () => {
    if (!storeId) return;
    setError(null);
    const current = steps[step];
    const isLast = step === steps.length - 1;

    // optional or last step: just advance/finish
    if (current.optional || isLast) {
      if (isLast) {
        finish();
        navigate(current.action.path);
      } else {
        setStep((s) => s + 1);
      }
      return;
    }

    setChecking(true);
    try {
      const { done, hint } = await current.check(storeId);
      if (!done) {
        setError(hint || "Conclua esta etapa antes de continuar.");
        return;
      }
      setStep((s) => s + 1);
    } catch (e: any) {
      setError("Não foi possível validar agora. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  const handleGoToAction = () => {
    setOpen(false);
    navigate(steps[step].action.path);
  };

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setOpen(true);
        else setOpen(false);
      }}
    >
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
              Bem-vindo{storeName ? `, ${storeName}` : ""}
            </p>
            <DialogTitle className="text-[20px] font-bold tracking-tight">
              Configuração guiada da sua loja
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Conclua cada etapa para liberar a próxima. Você pode pausar e retomar quando quiser.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-border"
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                  Etapa {step + 1} de {steps.length}
                </span>
                {current.optional && (
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Opcional
                  </span>
                )}
                {isLast && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Final
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-bold text-foreground mb-1.5">{current.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{current.description}</p>

              {error && (
                <div className="mt-3 flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!isLast && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleGoToAction}
                >
                  {current.action.label}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Continuar depois
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={checking}>
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Verificando…
                </>
              ) : isLast ? (
                <>
                  Concluir guia
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </>
              ) : current.optional ? (
                <>
                  Pular e continuar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Já fiz, verificar
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerOnboardingModal;

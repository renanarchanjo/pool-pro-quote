import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Palette,
  Layers,
  Package,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Rocket,
} from "lucide-react";

interface Props {
  userId: string;
  storeId?: string;
  storeName?: string | null;
}

const PROGRESS_KEY = "owner_onboarding_progress_v2";
const COMPLETED_KEY = "owner_onboarding_completed_v2";
const COLLAPSED_KEY = "owner_onboarding_collapsed_v2";

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
    title: "Dados da sua loja",
    description: "CNPJ, endereço, CEP, telefone e e-mail em Minha Conta.",
    action: { label: "Abrir Minha Conta", path: "/admin/perfil" },
    check: async (storeId) => {
      const { data } = await supabase
        .from("stores")
        .select("cnpj, address, cep, company_email, whatsapp")
        .eq("id", storeId)
        .maybeSingle();
      const ok = !!(data?.cnpj && data?.address && data?.cep && (data?.whatsapp || data?.company_email));
      return { done: ok, hint: ok ? undefined : "Faltam CNPJ, endereço, CEP e telefone/e-mail." };
    },
  },
  {
    icon: Layers,
    title: "Marcas e categorias",
    description: "Cadastre ao menos uma marca e categoria.",
    action: { label: "Cadastrar marcas", path: "/admin/marcas" },
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
    title: "Modelos no catálogo",
    description: "Cadastre os modelos com preço, medidas e itens inclusos.",
    action: { label: "Cadastrar modelos", path: "/admin/modelos" },
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
    title: "Convide sua equipe",
    description: "Adicione vendedores e configure comissões. (opcional)",
    action: { label: "Gerenciar equipe", path: "/admin/equipe" },
    optional: true,
    check: async () => ({ done: true }),
  },
  {
    icon: Sparkles,
    title: "Tudo pronto!",
    description: "Sua loja está configurada. Comece a gerar propostas.",
    action: { label: "Ir para o Dashboard", path: "/admin" },
    check: async () => ({ done: true }),
  },
];

const OwnerOnboardingModal = ({ userId, storeId, storeName }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() => steps.map(() => false));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(true);

  const progressKey = `${PROGRESS_KEY}:${userId}`;
  const completedKey = `${COMPLETED_KEY}:${userId}`;
  const collapsedKey = `${COLLAPSED_KEY}:${userId}`;

  // Initial load
  useEffect(() => {
    if (!userId || !storeId) return;
    if (localStorage.getItem(completedKey)) {
      setHidden(true);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}");
      if (Array.isArray(saved.completedSteps)) {
        setCompletedSteps(saved.completedSteps.length === steps.length ? saved.completedSteps : steps.map(() => false));
      }
      if (typeof saved.step === "number") setStep(Math.min(Math.max(saved.step, 0), steps.length - 1));
    } catch {}
    setCollapsed(localStorage.getItem(collapsedKey) === "1");
    setHidden(false);
  }, [userId, storeId, completedKey, progressKey, collapsedKey]);

  // Persist progress
  useEffect(() => {
    if (!userId || hidden) return;
    localStorage.setItem(progressKey, JSON.stringify({ step, completedSteps }));
  }, [step, completedSteps, userId, progressKey, hidden]);

  // Auto-finish only when ALL steps manually completed
  useEffect(() => {
    if (hidden) return;
    if (completedSteps.every(Boolean)) {
      localStorage.setItem(completedKey, "1");
      setHidden(true);
    }
  }, [completedSteps, completedKey, hidden]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(collapsedKey, next ? "1" : "0");
      return next;
    });
  }, [collapsedKey]);

  const handleConfirm = async () => {
    if (!storeId) return;
    setError(null);
    const current = steps[step];

    // Optional or final: mark and advance/finalize
    if (current.optional || step === steps.length - 1) {
      const updated = [...completedSteps];
      updated[step] = true;
      setCompletedSteps(updated);
      if (step < steps.length - 1) setStep(step + 1);
      return;
    }

    setChecking(true);
    try {
      const { done, hint } = await current.check(storeId);
      if (!done) {
        setError(hint || "Conclua esta etapa antes de continuar.");
        return;
      }
      const updated = [...completedSteps];
      updated[step] = true;
      setCompletedSteps(updated);
      if (step < steps.length - 1) setStep(step + 1);
    } catch {
      setError("Não foi possível validar agora. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  const goToStep = (i: number) => {
    setError(null);
    setStep(i);
  };

  if (hidden || !userId || !storeId) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const completedCount = completedSteps.filter(Boolean).length;
  const totalPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      className="fixed z-[60] right-4 bottom-4 md:right-6 md:bottom-6 w-[calc(100vw-32px)] sm:w-[380px] max-w-[380px]"
      style={{ marginBottom: "calc(var(--bottom-nav-height, 0px) + var(--safe-area-bottom, 0px))" }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:from-primary/15 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-primary" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary leading-none">
              Configuração da loja
            </p>
            <p className="text-[13px] font-bold text-foreground truncate mt-0.5">
              {completedCount}/{steps.length} etapas concluídas
            </p>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums mr-1">
            {totalPct}%
          </span>
          {collapsed ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${totalPct}%` }}
          />
        </div>

        {!collapsed && (
          <>
            {/* Steps list */}
            <div className="px-2 py-2 max-h-[180px] overflow-y-auto">
              {steps.map((s, i) => {
                const done = completedSteps[i];
                const active = i === step;
                return (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </div>
                    <span
                      className={`text-[12px] font-medium truncate flex-1 ${
                        done ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {s.title}
                    </span>
                    {s.optional && !done && (
                      <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        opcional
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active step detail */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Etapa {step + 1} de {steps.length}
                  </p>
                  <h3 className="text-[13px] font-bold text-foreground leading-tight">{current.title}</h3>
                  <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">
                    {current.description}
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 rounded-md mb-2">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[12px]"
                  onClick={() => navigate(current.action.path)}
                >
                  {current.action.label}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={handleConfirm}
                  disabled={checking || completedSteps[step]}
                >
                  {checking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : completedSteps[step] ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Feito
                    </>
                  ) : current.optional ? (
                    "Pular"
                  ) : isLast ? (
                    "Concluir"
                  ) : (
                    "Já fiz"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OwnerOnboardingModal;

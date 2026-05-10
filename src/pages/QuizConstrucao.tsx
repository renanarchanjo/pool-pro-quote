import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Waves } from "lucide-react";
import { toast } from "sonner";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
import { useGeolocation } from "@/hooks/useGeolocation";

type Tipo = "alvenaria" | "vinil";
type AreaTipo = "funda" | "prainha" | "spa" | "espelho";

interface Area {
  tipo: AreaTipo;
  comp: number;
  larg: number;
  prof: number;
}

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  offers_alvenaria: boolean;
  offers_vinil: boolean;
}

const PRESETS_FUNDA = [
  { label: "Pequena", comp: 4, larg: 2 },
  { label: "Média", comp: 6, larg: 3 },
  { label: "Grande", comp: 8, larg: 4 },
  { label: "Extra Grande", comp: 10, larg: 5 },
];

const PRESETS_PRAINHA = [
  { label: "2 x 1 m", comp: 2, larg: 1 },
  { label: "3 x 1,5 m", comp: 3, larg: 1.5 },
];

const PRESETS_SPA = [
  { label: "2 x 2 m", comp: 2, larg: 2 },
  { label: "3 x 2 m", comp: 3, larg: 2 },
];

const OPCIONAIS = [
  { id: "iluminacao", label: "Iluminação LED", icon: "💡" },
  { id: "cascata", label: "Cascata", icon: "🌊" },
  { id: "aquecimento_solar", label: "Aquecimento Solar", icon: "♨️" },
  { id: "trocador_calor", label: "Trocador de Calor", icon: "🔥" },
  { id: "hidromassagem", label: "Hidromassagem", icon: "💧" },
  { id: "gerador_cloro_salino", label: "Gerador de Cloro Salino", icon: "⚗️" },
  { id: "gerador_ozonio", label: "Gerador de Ozônio", icon: "🫧" },
];

const PRAZOS = [
  { id: "3_meses", label: "Nos próximos 3 meses" },
  { id: "3_6_meses", label: "Entre 3 e 6 meses" },
  { id: "6_meses_mais", label: "Em mais de 6 meses" },
  { id: "pesquisando", label: "Ainda estou pesquisando" },
];

const QuizConstrucao = () => {
  useForceLightTheme();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tipoInicial = (params.get("tipo") as Tipo | null) ?? null;

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Quiz state
  const [tipo, setTipo] = useState<Tipo | null>(tipoInicial);
  const [funda, setFunda] = useState<Area>({ tipo: "funda", comp: 0, larg: 0, prof: 1.4 });
  const [fundaPreset, setFundaPreset] = useState<string | null>(null);
  const [hasPrainha, setHasPrainha] = useState(false);
  const [prainha, setPrainha] = useState<Area>({ tipo: "prainha", comp: 0, larg: 0, prof: 0.5 });
  const [hasSpa, setHasSpa] = useState(false);
  const [spa, setSpa] = useState<Area>({ tipo: "spa", comp: 0, larg: 0, prof: 1.0 });
  const [hasEspelho, setHasEspelho] = useState(false);
  const [espelho, setEspelho] = useState<Area>({ tipo: "espelho", comp: 0, larg: 0, prof: 0.3 });
  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const { detectLocation, loading: geoLoading } = useGeolocation();

  // Auto-fill cidade with browser geolocation on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loc = await detectLocation();
      if (!cancelled && loc && loc.city) {
        setCidade((prev) => prev || `${loc.city}${loc.state ? ` - ${loc.state}` : ""}`);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [prazo, setPrazo] = useState<string>("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data } = await supabase.rpc("get_store_public_by_slug", { _slug: slug });
      const s = Array.isArray(data) ? data[0] : data;
      if (s) setStore(s as StoreInfo);
      setLoadingStore(false);
    };
    void load();
  }, [slug]);

  // Skip tipo step if only one offered OR tipo já veio na URL
  const skipTipo = useMemo(() => {
    if (tipoInicial === "alvenaria" || tipoInicial === "vinil") return true;
    if (!store) return false;
    return !(store.offers_alvenaria && store.offers_vinil);
  }, [store, tipoInicial]);

  useEffect(() => {
    if (skipTipo && store && !tipo) {
      if (store.offers_alvenaria) setTipo("alvenaria");
      else if (store.offers_vinil) setTipo("vinil");
    }
  }, [skipTipo, store, tipo]);

  const totalSteps = skipTipo ? 4 : 5;
  const [step, setStep] = useState(1);
  const effectiveStep = skipTipo ? step + 1 : step; // map UI step to spec step

  const canNext = () => {
    if (effectiveStep === 1) return !!tipo;
    if (effectiveStep === 2) return funda.comp > 0 && funda.larg > 0 && funda.prof > 0;
    if (effectiveStep === 3) {
      if (hasPrainha && !(prainha.comp > 0 && prainha.larg > 0)) return false;
      if (hasSpa && !(spa.comp > 0 && spa.larg > 0)) return false;
      if (hasEspelho && !(espelho.comp > 0 && espelho.larg > 0)) return false;
      return true;
    }
    if (effectiveStep === 4) return true;
    if (effectiveStep === 5) return nome.trim().length > 1 && whatsapp.replace(/\D/g, "").length >= 10;
    return true;
  };

  const goNext = () => {
    if (!canNext()) {
      toast.error("Preencha os campos obrigatórios para continuar.");
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const applyFundaPreset = (label: string, comp: number, larg: number) => {
    setFundaPreset(label);
    setFunda({ tipo: "funda", comp, larg, prof: funda.prof || 1.4 });
  };

  const submit = async () => {
    if (!store) return;
    if (!canNext()) {
      toast.error("Preencha nome e WhatsApp.");
      return;
    }
    setSubmitting(true);
    try {
      const areas: Area[] = [funda];
      if (hasPrainha) areas.push(prainha);
      if (hasSpa) areas.push(spa);
      if (hasEspelho) areas.push(espelho);

      const quiz_data = {
        tipo_piscina: tipo,
        areas,
        opcionais,
        prazo,
        observacoes: obs,
      };

      const cleanWhats = whatsapp.replace(/\D/g, "");
      const wa = cleanWhats.startsWith("55") ? cleanWhats : `55${cleanWhats}`;

      const { error } = await supabase.from("proposals").insert({
        store_id: store.id,
        customer_name: nome.trim(),
        customer_city: cidade.trim() || "—",
        customer_whatsapp: wa,
        total_price: 1, // placeholder — lead de construção não tem preço calculado
        lead_type: tipo ?? "construcao",
        quiz_data,
        selected_optionals: [],
      } as any);

      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err?.message || "tente novamente"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Loja não encontrada</h1>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  if (!store.offers_alvenaria && !store.offers_vinil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Esta loja não oferece esse tipo de piscina</h1>
        <Button onClick={() => navigate(`/s/${slug}`)}>Voltar à loja</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Solicitação enviada com sucesso!</h1>
          <p className="text-muted-foreground mb-6">
            A loja <strong>{store.name}</strong> recebeu suas informações e entrará em contato em breve pelo WhatsApp informado.
          </p>
          <Button className="w-full" onClick={() => navigate(`/s/${slug}`)}>
            Voltar para a loja
          </Button>
        </Card>
      </div>
    );
  }

  const progress = (step / totalSteps) * 100;

  return (
    <>
      <Helmet>
        <title>Quiz Piscina de Construção · {store.name}</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(`/s/${slug}`)}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar à loja
          </button>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-primary" /> Quiz de Construção</span>
              <span>Passo {step} de {totalSteps}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="p-6 sm:p-8">
            {/* PASSO 1 — Tipo */}
            {effectiveStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Que tipo de piscina você quer construir?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Escolha o tipo que mais se adequa ao seu projeto.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {store.offers_alvenaria && (
                    <button
                      onClick={() => setTipo("alvenaria")}
                      className={`text-left rounded-xl border-2 p-5 transition ${tipo === "alvenaria" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="text-2xl mb-2">🧱</div>
                      <div className="font-semibold">Alvenaria</div>
                      <div className="text-xs text-muted-foreground mt-1">Pastilha ou cerâmica, estrutura sólida em concreto.</div>
                    </button>
                  )}
                  {store.offers_vinil && (
                    <button
                      onClick={() => setTipo("vinil")}
                      className={`text-left rounded-xl border-2 p-5 transition ${tipo === "vinil" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="text-2xl mb-2">🎨</div>
                      <div className="font-semibold">Vinil Tela Armada</div>
                      <div className="text-xs text-muted-foreground mt-1">Revestimento em vinil, construção mais rápida.</div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 2 — Área principal */}
            {effectiveStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Qual o tamanho da área principal da sua piscina?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Você pode escolher uma sugestão ou personalizar.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PRESETS_FUNDA.map(p => (
                    <button
                      key={p.label}
                      onClick={() => applyFundaPreset(p.label, p.comp, p.larg)}
                      className={`text-left rounded-xl border-2 p-4 transition ${fundaPreset === p.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.comp} x {p.larg} m</div>
                    </button>
                  ))}
                  <button
                    onClick={() => { setFundaPreset("custom"); setFunda({ ...funda, comp: 0, larg: 0 }); }}
                    className={`text-left rounded-xl border-2 p-4 transition sm:col-span-2 ${fundaPreset === "custom" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="font-semibold">Personalizado</div>
                    <div className="text-xs text-muted-foreground mt-1">Informe as medidas exatas.</div>
                  </button>
                </div>

                {fundaPreset === "custom" && (
                  <div className="grid sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Comprimento (m)</Label>
                      <Input type="number" step="0.1" min={0} value={funda.comp || ""} onChange={e => setFunda({ ...funda, comp: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Largura (m)</Label>
                      <Input type="number" step="0.1" min={0} value={funda.larg || ""} onChange={e => setFunda({ ...funda, larg: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Profundidade (m)</Label>
                      <Input type="number" step="0.1" min={0} value={funda.prof || ""} onChange={e => setFunda({ ...funda, prof: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                )}

                {fundaPreset && fundaPreset !== "custom" && (
                  <div className="text-sm text-muted-foreground border-t pt-3">
                    Profundidade: <strong>{funda.prof.toFixed(2)} m</strong>{" "}
                    <button className="text-primary underline ml-2" onClick={() => setFundaPreset("custom")}>alterar</button>
                  </div>
                )}
              </div>
            )}

            {/* PASSO 3 — Áreas extras */}
            {effectiveStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Sua piscina terá alguma área extra?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Marque as áreas adicionais que deseja incluir.</p>
                </div>

                {/* Prainha */}
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Prainha</p>
                      <p className="text-xs text-muted-foreground">Área rasa para crianças e lazer.</p>
                    </div>
                    <Switch checked={hasPrainha} onCheckedChange={setHasPrainha} />
                  </div>
                  {hasPrainha && (
                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                      {PRESETS_PRAINHA.map(p => (
                        <button key={p.label} onClick={() => setPrainha({ tipo: "prainha", comp: p.comp, larg: p.larg, prof: 0.5 })}
                          className={`text-sm rounded-lg border p-2 ${prainha.comp === p.comp && prainha.larg === p.larg ? "border-primary bg-primary/5" : "border-border"}`}>
                          {p.label}
                        </button>
                      ))}
                      <div className="sm:col-span-3 grid grid-cols-2 gap-2 pt-2">
                        <Input type="number" placeholder="Comp (m)" step="0.1" value={prainha.comp || ""} onChange={e => setPrainha({ ...prainha, comp: parseFloat(e.target.value) || 0 })} />
                        <Input type="number" placeholder="Larg (m)" step="0.1" value={prainha.larg || ""} onChange={e => setPrainha({ ...prainha, larg: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Spa */}
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Spa / Banheira</p>
                      <p className="text-xs text-muted-foreground">Área menor com hidromassagem.</p>
                    </div>
                    <Switch checked={hasSpa} onCheckedChange={setHasSpa} />
                  </div>
                  {hasSpa && (
                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                      {PRESETS_SPA.map(p => (
                        <button key={p.label} onClick={() => setSpa({ tipo: "spa", comp: p.comp, larg: p.larg, prof: 1.0 })}
                          className={`text-sm rounded-lg border p-2 ${spa.comp === p.comp && spa.larg === p.larg ? "border-primary bg-primary/5" : "border-border"}`}>
                          {p.label}
                        </button>
                      ))}
                      <div className="sm:col-span-3 grid grid-cols-2 gap-2 pt-2">
                        <Input type="number" placeholder="Comp (m)" step="0.1" value={spa.comp || ""} onChange={e => setSpa({ ...spa, comp: parseFloat(e.target.value) || 0 })} />
                        <Input type="number" placeholder="Larg (m)" step="0.1" value={spa.larg || ""} onChange={e => setSpa({ ...spa, larg: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Espelho */}
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Espelho d'água</p>
                      <p className="text-xs text-muted-foreground">Área decorativa com lâmina de água.</p>
                    </div>
                    <Switch checked={hasEspelho} onCheckedChange={setHasEspelho} />
                  </div>
                  {hasEspelho && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Comp (m)" step="0.1" value={espelho.comp || ""} onChange={e => setEspelho({ ...espelho, comp: parseFloat(e.target.value) || 0 })} />
                      <Input type="number" placeholder="Larg (m)" step="0.1" value={espelho.larg || ""} onChange={e => setEspelho({ ...espelho, larg: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full" onClick={() => { setHasPrainha(false); setHasSpa(false); setHasEspelho(false); setStep(s => Math.min(s + 1, totalSteps)); }}>
                  Não quero áreas extras
                </Button>
              </div>
            )}

            {/* PASSO 4 — Opcionais */}
            {effectiveStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">O que você gostaria de incluir na sua piscina?</h2>
                  <p className="text-sm text-muted-foreground mt-1">A loja irá dimensionar esses itens conforme o tamanho da sua piscina.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {OPCIONAIS.map(o => {
                    const checked = opcionais.includes(o.id);
                    return (
                      <label key={o.id} className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          setOpcionais(prev => v ? [...prev, o.id] : prev.filter(x => x !== o.id));
                        }} />
                        <span className="text-xl">{o.icon}</span>
                        <span className="text-sm font-medium">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Os itens marcados serão incluídos como recomendação na proposta gerada pela loja.
                </p>
              </div>
            )}

            {/* PASSO 5 — Dados */}
            {effectiveStep === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Quase lá!</h2>
                  <p className="text-sm text-muted-foreground mt-1">Precisamos de algumas informações para enviar sua proposta.</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nome completo *</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" maxLength={120} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp *</Label>
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cidade / Estado</Label>
                    <Input
                      value={cidade}
                      onChange={e => setCidade(e.target.value)}
                      placeholder={geoLoading && !cidade ? "Detectando sua localização..." : "Cidade - UF"}
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quando pretende construir?</Label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {PRAZOS.map(p => (
                        <button key={p.id} onClick={() => setPrazo(p.id)}
                          className={`text-left rounded-lg border-2 p-3 text-sm transition ${prazo === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Observações (opcional)</Label>
                    <textarea
                      value={obs}
                      onChange={e => setObs(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="flex w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15"
                      placeholder="Algo que devamos saber sobre seu projeto?"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navegação */}
            <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t">
              <Button variant="ghost" onClick={goBack} disabled={step === 1}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              {step < totalSteps ? (
                <Button onClick={goNext} disabled={!canNext()}>
                  Próximo <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting || !canNext()}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Enviar solicitação
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default QuizConstrucao;

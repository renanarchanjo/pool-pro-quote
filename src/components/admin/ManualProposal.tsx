import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { Loader2, FileText, ArrowLeft, Eye, EyeOff, ChevronRight, User, Waves, Settings, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import ProposalView from "@/components/simulator/ProposalView";

interface PoolModel {
  id: string;
  name: string;
  category_id: string;
  length: number | null;
  width: number | null;
  depth: number | null;
  photo_url: string | null;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
  payment_terms: string | null;
  notes: string | null;
}

interface Optional {
  id: string;
  name: string;
  description: string;
  price: number;
  group_id: string;
  warning_note: string | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string | null;
  partner_id?: string | null;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  banner_1_url: string | null;
  banner_2_url: string | null;
  display_percent?: number;
}

interface Category {
  id: string;
  name: string;
  brand_id: string | null;
}

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const STEP_CONFIG = [
  { label: "Cliente", icon: User },
  { label: "Modelo", icon: Waves },
  { label: "Opcionais", icon: Settings },
  { label: "Enviar", icon: Send },
];

const ManualProposal = () => {
  const { profile, store, storeSettings } = useStoreData();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [modelOptionals, setModelOptionals] = useState<any[]>([]);
  const [optionalGroups, setOptionalGroups] = useState<{ id: string; name: string; description: string | null; display_order: number }[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [includedItemsTotal, setIncludedItemsTotal] = useState(0);

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<string[]>([]);
  const [selectedModelOptIds, setSelectedModelOptIds] = useState<string[]>([]);
  const [enabledOptionalIds, setEnabledOptionalIds] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerUf, setCustomerUf] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerCities, setCustomerCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");

  useEffect(() => {
    if (profile?.store_id) loadData();
  }, [profile?.store_id]);

  useEffect(() => {
    if (!customerUf) { setCustomerCities([]); return; }
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${customerUf}/municipios?orderBy=nome`);
        const data = await res.json();
        setCustomerCities(data.map((m: any) => m.nome));
      } catch { setCustomerCities([]); }
      finally { setLoadingCities(false); }
    };
    fetchCities();
  }, [customerUf]);

  useEffect(() => {
    setEnabledOptionalIds(optionals.map((o) => o.id));
  }, [optionals]);

  useEffect(() => {
    if (!selectedModel) { setIncludedItemsTotal(0); return; }
    const fetchInclTotal = async () => {
      const { data } = await supabase
        .from("model_included_items")
        .select("price")
        .eq("model_id", selectedModel.id)
        .eq("active", true);
      setIncludedItemsTotal((data || []).reduce((sum, item) => sum + Number(item.price), 0));
    };
    fetchInclTotal();
  }, [selectedModel?.id]);

  const loadData = async () => {
    try {
      const storeId = profile!.store_id!;
      const [brandRes, catRes, modRes, optRes, modelOptRes, groupsRes, partnersRes] = await Promise.all([
        supabase.from("brands").select("id, name, logo_url, partner_id").eq("store_id", storeId).eq("active", true).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("store_id", storeId).eq("active", true).order("name"),
        supabase.from("pool_models").select("*").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("optionals").select("*").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("model_optionals").select("*").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("optional_groups").select("id, name, description, display_order").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("partners").select("id, name, logo_url, banner_1_url, banner_2_url, display_percent").eq("active", true).order("display_order"),
      ]);
      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);
      setModels(modRes.data || []);
      setOptionals(optRes.data || []);
      setModelOptionals(modelOptRes.data || []);
      setOptionalGroups(groupsRes.data || []);
      setPartners(partnersRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = selectedBrandId
    ? categories.filter((c) => c.brand_id === selectedBrandId)
    : categories;

  const filteredModels = selectedCategoryId
    ? models.filter((m) => m.category_id === selectedCategoryId)
    : selectedBrandId
    ? models.filter((m) => filteredCategories.some((c) => c.id === m.category_id))
    : models;

  const visibleOptionals = optionals.filter((o) => enabledOptionalIds.includes(o.id));
  const selectedOptionalsList = optionals.filter((o) => selectedOptionalIds.includes(o.id));
  const currentModelOpts = selectedModel ? modelOptionals.filter((o: any) => o.model_id === selectedModel.id) : [];
  const selectedModelOptsList = currentModelOpts.filter((o: any) => selectedModelOptIds.includes(o.id));
  const optionalsTotal = selectedOptionalsList.reduce((s, o) => s + o.price, 0) + selectedModelOptsList.reduce((s: number, o: any) => s + o.price, 0);
  const totalPrice = (selectedModel?.base_price || 0) + includedItemsTotal + optionalsTotal;

  const toggleEnabled = (id: string) => {
    setEnabledOptionalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedOptionalIds((prev) => prev.filter((x) => x !== id || enabledOptionalIds.includes(id) === false));
  };

  const toggleOptional = (id: string) => {
    const opt = optionals.find((o) => o.id === id);
    if (!opt) return;
    setSelectedOptionalIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const sameGroupIds = opt.group_id
        ? optionals.filter((o) => o.group_id === opt.group_id).map((o) => o.id)
        : [];
      const withoutSameGroup = prev.filter((x) => !sameGroupIds.includes(x));
      return [...withoutSameGroup, id];
    });
  };

  const handleSubmit = async () => {
    if (!customerName || !customerCity || !customerUf || !customerWhatsapp) {
      toast.error("Preencha todos os dados do cliente");
      if (isMobile) setMobileStep(0);
      return;
    }
    if (!selectedModel) {
      toast.error("Selecione um modelo de piscina");
      if (isMobile) setMobileStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const allSelectedOpts = [
        ...selectedOptionalsList.map(o => ({ id: o.id, name: o.name, price: o.price })),
        ...selectedModelOptsList.map((o: any) => ({ id: o.id, name: o.name, price: o.price })),
      ];

      const { error } = await supabase.from("proposals").insert({
        customer_name: customerName,
        customer_city: `${customerCity} / ${customerUf}`,
        customer_whatsapp: customerWhatsapp,
        model_id: selectedModel.id,
        selected_optionals: allSelectedOpts as any,
        total_price: totalPrice,
        store_id: profile!.store_id!,
        created_by: profile!.id,
      });
      if (error) throw error;
      toast.success("Proposta gerada com sucesso!");
      setShowProposal(true);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar proposta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setShowProposal(false);
    setSelectedModel(null);
    setSelectedBrandId("");
    setSelectedCategoryId("");
    setSelectedOptionalIds([]);
    setSelectedModelOptIds([]);
    setCustomerName("");
    setCustomerUf("");
    setCustomerCity("");
    setCustomerWhatsapp("");
    setMobileStep(0);
  };

  // Validation per step
  const canAdvanceStep = (step: number): boolean => {
    if (step === 0) return !!(customerName && customerUf && customerCity && customerWhatsapp);
    if (step === 1) return !!selectedModel;
    return true;
  };

  const handleNextStep = () => {
    if (!canAdvanceStep(mobileStep)) {
      if (mobileStep === 0) toast.error("Preencha todos os dados do cliente");
      if (mobileStep === 1) toast.error("Selecione um modelo de piscina");
      return;
    }
    setMobileStep((s) => Math.min(s + 1, 3));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showProposal && selectedModel) {
    return (
      <div>
        <Button variant="ghost" onClick={handleReset} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Nova Proposta
        </Button>
        {(() => {
          const cat = categories.find(c => c.id === selectedModel.category_id);
          const brand = cat?.brand_id ? brands.find(b => b.id === cat.brand_id) : null;
          return (
            <ProposalView
              model={selectedModel}
              selectedOptionals={[...selectedOptionalsList, ...selectedModelOptsList.map((o: any) => ({ name: o.name, price: o.price }))]}
              customerData={{ name: customerName, city: `${customerCity} / ${customerUf}`, whatsapp: customerWhatsapp }}
              category={cat?.name || "Piscina"}
              onBack={handleReset}
              storeSettings={storeSettings}
              storeName={store?.name}
              storeCity={store?.city}
              storeState={store?.state}
              brandLogoUrl={brand?.logo_url}
              brandName={brand?.name}
              brandPartnerId={brand?.partner_id}
              partners={partners}
              includedItemsTotal={includedItemsTotal}
            />
          );
        })()}
      </div>
    );
  }

  const allEnabled = enabledOptionalIds.length === optionals.length;

  // ── Shared sub-renders ──

  const renderCustomerFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cname">Nome Completo *</Label>
        <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
      </div>
      <div>
        <Label htmlFor="cuf">Estado (UF) *</Label>
        <select
          id="cuf"
          value={customerUf}
          onChange={(e) => { setCustomerUf(e.target.value); setCustomerCity(""); }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Selecione o estado</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ccity">Cidade *</Label>
        {loadingCities ? (
          <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando cidades...
          </div>
        ) : customerCities.length > 0 ? (
          <select
            id="ccity"
            value={customerCity}
            onChange={(e) => setCustomerCity(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecione a cidade</option>
            {customerCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <Input id="ccity" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} placeholder="Selecione um estado primeiro" />
        )}
      </div>
      <div>
        <Label htmlFor="cwhat">WhatsApp *</Label>
        <Input id="cwhat" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
      </div>
    </div>
  );

  const renderModelFields = () => (
    <div className="space-y-4">
      <div>
        <Label>Marca *</Label>
        <Select value={selectedBrandId} onValueChange={(v) => { setSelectedBrandId(v === "all" ? "" : v); setSelectedCategoryId(""); setSelectedModel(null); }}>
          <SelectTrigger><SelectValue placeholder="Selecione uma marca" /></SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}{b.partner_id ? " ®" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Categoria *</Label>
        <Select value={selectedCategoryId} onValueChange={(v) => { setSelectedCategoryId(v === "all" ? "" : v); setSelectedModel(null); }} disabled={!selectedBrandId}>
          <SelectTrigger><SelectValue placeholder={selectedBrandId ? "Selecione a categoria" : "Selecione uma marca primeiro"} /></SelectTrigger>
          <SelectContent>
            {filteredCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Modelo *</Label>
        <Select value={selectedModel?.id || ""} onValueChange={(v) => setSelectedModel(filteredModels.find((m) => m.id === v) || null)} disabled={!selectedCategoryId}>
          <SelectTrigger><SelectValue placeholder={selectedCategoryId ? "Selecione um modelo" : "Selecione a categoria primeiro"} /></SelectTrigger>
          <SelectContent>
            {filteredModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} — R$ {m.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedModel && (
        <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
          {selectedModel.length && selectedModel.width && (
            <p>{selectedModel.length}m × {selectedModel.width}m{selectedModel.depth ? ` × ${selectedModel.depth}m` : ""}</p>
          )}
          <p className="font-semibold text-foreground">
            Base: R$ {selectedModel.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );

  const renderOptionalCard = (opt: Optional, isEnabled: boolean, isSelected: boolean, showToggle = true) => (
    <div
      key={opt.id}
      onClick={() => isEnabled && toggleOptional(opt.id)}
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        !isEnabled
          ? "border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
          : isSelected
          ? "border-primary bg-primary/5 shadow-sm cursor-pointer"
          : "border-border hover:border-primary/40 cursor-pointer"
      }`}
    >
      {showToggle && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleEnabled(opt.id); }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors z-10"
          title={isEnabled ? "Desativar opcional" : "Ativar opcional"}
        >
          {isEnabled ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      )}
      <Checkbox checked={isSelected} className="pointer-events-none mt-0.5" disabled={!isEnabled} />
      <div className={`flex-1 min-w-0 ${showToggle ? "pr-5" : ""}`}>
        <p className="text-sm font-medium leading-tight">{opt.name}</p>
        <p className="text-xs text-primary font-semibold mt-1">
          + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );

  const renderOptionalsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Opcionais</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{allEnabled ? "Desativar todos" : "Ativar todos"}</span>
          <Switch
            checked={allEnabled}
            onCheckedChange={(checked) => {
              setEnabledOptionalIds(checked ? optionals.map((o) => o.id) : []);
              if (!checked) setSelectedOptionalIds([]);
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Use o <Eye className="w-3 h-3 inline" /> para ativar/desativar opcionais visíveis na proposta
      </p>

      {optionals.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum opcional cadastrado.</p>
      ) : (
        <>
          {optionalGroups.map((group) => {
            const groupOpts = optionals.filter((o) => o.group_id === group.id).sort((a, b) => a.price - b.price);
            if (groupOpts.length === 0) return null;
            return (
              <div key={group.id}>
                <h4 className="text-sm font-bold text-foreground mb-1">{group.name}</h4>
                {group.description && <p className="text-xs text-muted-foreground mb-2">{group.description}</p>}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupOpts.map((opt) => renderOptionalCard(opt, enabledOptionalIds.includes(opt.id), selectedOptionalIds.includes(opt.id)))}
                </div>
              </div>
            );
          })}
          {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-2">Outros</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).sort((a, b) => a.price - b.price).map((opt) =>
                  renderOptionalCard(opt, enabledOptionalIds.includes(opt.id), selectedOptionalIds.includes(opt.id))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {selectedModel && currentModelOpts.length > 0 && (
        <div className="pt-2">
          <h3 className="text-base font-semibold mb-1">Opcionais Dimensionados — {selectedModel.name}</h3>
          <p className="text-xs text-muted-foreground mb-3">Opcionais específicos calculados para este modelo</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentModelOpts.map((opt: any) => {
              const isSelected = selectedModelOptIds.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedModelOptIds((prev) => prev.includes(opt.id) ? prev.filter((x: string) => x !== opt.id) : [...prev, opt.id])}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{opt.name}</p>
                    {opt.description && <p className="text-xs text-muted-foreground">{opt.description}</p>}
                    <p className="text-xs text-primary font-semibold mt-1">
                      + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderSummaryStep = () => (
    <div className="space-y-5">
      {/* Customer summary */}
      <div className="rounded-lg border border-border p-4 space-y-1">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cliente</h4>
        <p className="font-medium">{customerName || "—"}</p>
        <p className="text-sm text-muted-foreground">{customerCity ? `${customerCity} / ${customerUf}` : "—"}</p>
        <p className="text-sm text-muted-foreground">{customerWhatsapp || "—"}</p>
      </div>

      {/* Model summary */}
      <div className="rounded-lg border border-border p-4 space-y-1">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modelo</h4>
        {selectedModel ? (
          <>
            <p className="font-medium">{selectedModel.name}</p>
            {selectedModel.length && selectedModel.width && (
              <p className="text-sm text-muted-foreground">{selectedModel.length}m × {selectedModel.width}m{selectedModel.depth ? ` × ${selectedModel.depth}m` : ""}</p>
            )}
            <p className="text-sm">Base: R$ {selectedModel.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </>
        ) : (
          <p className="text-muted-foreground">Nenhum modelo selecionado</p>
        )}
      </div>

      {/* Optionals summary */}
      {(selectedOptionalsList.length > 0 || selectedModelOptsList.length > 0) && (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Opcionais</h4>
          {selectedOptionalsList.map((o) => (
            <div key={o.id} className="flex justify-between text-sm">
              <span>{o.name}</span>
              <span className="text-primary font-medium">+ R$ {o.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          {selectedModelOptsList.map((o: any) => (
            <div key={o.id} className="flex justify-between text-sm">
              <span>{o.name}</span>
              <span className="text-primary font-medium">+ R$ {o.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">Total da Proposta</p>
        <p className="text-2xl font-bold text-primary">
          R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <Button
        size="lg"
        className="w-full gradient-primary text-white"
        onClick={handleSubmit}
        disabled={submitting || !selectedModel}
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
        ) : (
          <><FileText className="w-4 h-4 mr-2" /> Gerar Proposta</>
        )}
      </Button>
    </div>
  );

  // ── Mobile step-by-step layout ──
  if (isMobile) {
    return (
      <div className="pb-4">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEP_CONFIG.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === mobileStep;
            const isDone = i < mobileStep;
            return (
              <button
                key={i}
                onClick={() => i < mobileStep && setMobileStep(i)}
                className="flex flex-col items-center gap-1 flex-1"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isDone
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step title */}
        <h2 className="text-lg font-bold mb-4">
          {STEP_CONFIG[mobileStep].label}
        </h2>

        {/* Step content */}
        {mobileStep === 0 && renderCustomerFields()}
        {mobileStep === 1 && renderModelFields()}
        {mobileStep === 2 && renderOptionalsContent()}
        {mobileStep === 3 && renderSummaryStep()}

        {/* Navigation buttons */}
        {mobileStep < 3 && (
          <div className="flex gap-3 mt-6">
            {mobileStep > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setMobileStep((s) => s - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            )}
            <Button className="flex-1 gradient-primary text-white" onClick={handleNextStep}>
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
        {mobileStep === 3 && mobileStep > 0 && (
          <Button variant="outline" className="w-full mt-3" onClick={() => setMobileStep((s) => s - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        )}
      </div>
    );
  }

  // ── Desktop layout (unchanged grid) ──
  return (
    <div className="max-w-4xl">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados do Cliente</CardTitle></CardHeader>
          <CardContent>{renderCustomerFields()}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Modelo de Piscina</CardTitle></CardHeader>
          <CardContent>{renderModelFields()}</CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Opcionais</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{allEnabled ? "Desativar todos" : "Ativar todos"}</span>
                <Switch
                  checked={allEnabled}
                  onCheckedChange={(checked) => {
                    setEnabledOptionalIds(checked ? optionals.map((o) => o.id) : []);
                    if (!checked) setSelectedOptionalIds([]);
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use o <Eye className="w-3 h-3 inline" /> para ativar/desativar opcionais visíveis na proposta
            </p>
          </CardHeader>
          <CardContent>
            {optionals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum opcional cadastrado.</p>
            ) : (
              <div className="space-y-6">
                {optionalGroups.map((group) => {
                  const groupOpts = optionals.filter((o) => o.group_id === group.id).sort((a, b) => a.price - b.price);
                  if (groupOpts.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <h4 className="text-sm font-bold text-foreground mb-1">{group.name}</h4>
                      {group.description && <p className="text-xs text-muted-foreground mb-2">{group.description}</p>}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {groupOpts.map((opt) => renderOptionalCard(opt, enabledOptionalIds.includes(opt.id), selectedOptionalIds.includes(opt.id)))}
                      </div>
                    </div>
                  );
                })}
                {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-2">Outros</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).sort((a, b) => a.price - b.price).map((opt) =>
                        renderOptionalCard(opt, enabledOptionalIds.includes(opt.id), selectedOptionalIds.includes(opt.id))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedModel && currentModelOpts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Opcionais Dimensionados — {selectedModel.name}</CardTitle>
              <p className="text-xs text-muted-foreground">Opcionais específicos calculados para este modelo</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentModelOpts.map((opt: any) => {
                  const isSelected = selectedModelOptIds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedModelOptIds((prev) => prev.includes(opt.id) ? prev.filter((x: string) => x !== opt.id) : [...prev, opt.id])}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{opt.name}</p>
                        {opt.description && <p className="text-xs text-muted-foreground">{opt.description}</p>}
                        <p className="text-xs text-primary font-semibold mt-1">
                          + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Resumo</p>
                <div className="flex flex-wrap gap-2">
                  {selectedModel && <Badge variant="secondary">{selectedModel.name}</Badge>}
                  {selectedOptionalsList.length > 0 && (
                    <Badge variant="outline">{selectedOptionalsList.length} opcional(is)</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">
                  R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button
                size="lg"
                className="gradient-primary text-white"
                onClick={handleSubmit}
                disabled={submitting || !selectedModel}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" /> Gerar Proposta</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualProposal;

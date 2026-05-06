import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { Loader2, FileText, ArrowLeft, Eye, EyeOff, ChevronRight, ChevronLeft, User, Waves, Settings, Send, Check, Sparkles } from "lucide-react";
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
        supabase.from("pool_models").select("id, name, category_id, length, width, depth, photo_url, differentials, included_items, not_included_items, base_price, delivery_days, installation_days, payment_terms, notes").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("optionals").select("id, name, description, price, group_id, warning_note, cost, margin_percent, item_type").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("model_optionals").select("id, name, description, price, model_id, cost, margin_percent, item_type").eq("store_id", storeId).eq("active", true).order("display_order"),
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

  const filteredModels = (selectedCategoryId
    ? models.filter((m) => m.category_id === selectedCategoryId)
    : selectedBrandId
    ? models.filter((m) => filteredCategories.some((c) => c.id === m.category_id))
    : models
  ).slice().sort((a, b) => {
    const areaA = (Number(a.length) || 0) * (Number(a.width) || 0);
    const areaB = (Number(b.length) || 0) * (Number(b.width) || 0);
    if (areaB !== areaA) return areaB - areaA;
    return (Number(b.length) || 0) - (Number(a.length) || 0);
  });

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

    if (!profile?.store_id) {
      toast.error("Não foi possível identificar a loja. Faça login novamente.");
      return;
    }

    setSubmitting(true);
    try {
      const allSelectedOpts = [
        ...selectedOptionalsList.map(o => ({ id: o.id, name: o.name, price: o.price })),
        ...selectedModelOptsList.map((o: any) => ({ id: o.id, name: o.name, price: o.price })),
      ];

      const { sanitizeText, sanitizePhone, sanitizeCurrency } = await import("@/lib/sanitize");

      const { error } = await supabase.from("proposals").insert({
        customer_name: sanitizeText(customerName, 200),
        customer_city: sanitizeText(`${customerCity} / ${customerUf}`, 200),
        customer_whatsapp: sanitizePhone(customerWhatsapp),
        model_id: selectedModel.id,
        selected_optionals: allSelectedOpts as any,
        total_price: sanitizeCurrency(totalPrice),
        store_id: profile.store_id,
        created_by: profile.id,
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
              storeWhatsapp={store?.whatsapp}
            />
          );
        })()}
      </div>
    );
  }

  const allEnabled = enabledOptionalIds.length === optionals.length;

  // ── Shared sub-renders ──

  const renderCustomerFields = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Nome Completo *</label>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nome do cliente"
          className="h-12 rounded-xl text-base bg-muted/40 border-border/50 focus:border-primary focus:bg-background transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Estado (UF) *</label>
        <select
          value={customerUf}
          onChange={(e) => { setCustomerUf(e.target.value); setCustomerCity(""); }}
          className="flex h-12 w-full rounded-xl border border-border/50 bg-muted/40 px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:bg-background transition-all"
        >
          <option value="">Selecione o estado</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Cidade *</label>
        {loadingCities ? (
          <div className="flex items-center gap-2 h-12 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando cidades...
          </div>
        ) : customerCities.length > 0 ? (
          <select
            value={customerCity}
            onChange={(e) => setCustomerCity(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-border/50 bg-muted/40 px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:bg-background transition-all"
          >
            <option value="">Selecione a cidade</option>
            {customerCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <Input
            value={customerCity}
            onChange={(e) => setCustomerCity(e.target.value)}
            placeholder="Selecione um estado primeiro"
            className="h-12 rounded-xl text-base bg-muted/40 border-border/50"
            disabled
          />
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">WhatsApp *</label>
        <Input
          value={customerWhatsapp}
          onChange={(e) => setCustomerWhatsapp(e.target.value)}
          placeholder="(00) 00000-0000"
          className="h-12 rounded-xl text-base bg-muted/40 border-border/50 focus:border-primary focus:bg-background transition-all"
        />
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
                {m.name}
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
            Base: R$ {(selectedModel.base_price + includedItemsTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
      {showToggle && <Checkbox checked={isSelected} className="pointer-events-none mt-0.5" disabled={!isEnabled} />}
      <div className={`flex-1 min-w-0 ${showToggle ? "pr-5" : ""}`}>
        <p className="text-sm font-medium leading-tight">{opt.name}</p>
        <p className="text-xs text-primary font-semibold mt-1">
          + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );

  const renderOptionalsContent = (showToggle = true) => (
    <div className="space-y-6">
      {showToggle && (
        <>
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
        </>
      )}

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
                  {groupOpts.map((opt) => renderOptionalCard(opt, enabledOptionalIds.includes(opt.id), selectedOptionalIds.includes(opt.id), showToggle))}
                </div>
              </div>
            );
          })}
          {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-2">Outros</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).sort((a, b) => a.price - b.price).map((opt) =>
                  renderOptionalCard(opt, enabledOptionalIds.includes(opt.id), selectedOptionalIds.includes(opt.id), showToggle)
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
    <div className="space-y-4">
      {/* Customer summary */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</h4>
        </div>
        <p className="font-semibold text-foreground">{customerName || "—"}</p>
        <p className="text-sm text-muted-foreground">{customerCity ? `${customerCity} / ${customerUf}` : "—"}</p>
        <p className="text-sm text-muted-foreground">{customerWhatsapp || "—"}</p>
      </div>

      {/* Model summary */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Waves className="w-3.5 h-3.5 text-primary" />
          </div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modelo</h4>
        </div>
        {selectedModel ? (
          <>
            <p className="font-semibold text-foreground">{selectedModel.name}</p>
            {selectedModel.length && selectedModel.width && (
              <p className="text-sm text-muted-foreground">{selectedModel.length}m × {selectedModel.width}m{selectedModel.depth ? ` × ${selectedModel.depth}m` : ""}</p>
            )}
            <p className="text-sm text-muted-foreground">Base: R$ {(selectedModel.base_price + includedItemsTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </>
        ) : (
          <p className="text-muted-foreground">Nenhum modelo selecionado</p>
        )}
      </div>

      {/* Optionals summary */}
      {(selectedOptionalsList.length > 0 || selectedModelOptsList.length > 0) && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-primary" />
            </div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Opcionais</h4>
          </div>
          {selectedOptionalsList.map((o) => (
            <div key={o.id} className="flex justify-between text-sm">
              <span className="text-foreground">{o.name}</span>
              <span className="text-primary font-semibold">+ R$ {o.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          {selectedModelOptsList.map((o: any) => (
            <div key={o.id} className="flex justify-between text-sm">
              <span className="text-foreground">{o.name}</span>
              <span className="text-primary font-semibold">+ R$ {o.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 text-center">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total da Proposta</p>
        <p className="text-3xl font-extrabold text-primary tracking-tight">
          R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedModel}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:pointer-events-none"
      >
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</>
        ) : (
          <><Sparkles className="w-5 h-5" /> Gerar Proposta</>
        )}
      </button>
    </div>
  );

  // ── Mobile step-by-step layout (Duolingo-inspired) ──
  if (isMobile) {
    const progress = ((mobileStep) / (STEP_CONFIG.length - 1)) * 100;

    return (
      <div className="flex flex-col min-h-[calc(100dvh-140px)]">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-6">
          {mobileStep > 0 && (
            <button
              onClick={() => setMobileStep((s) => s - 1)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-90 transition-all shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
            {mobileStep + 1}/{STEP_CONFIG.length}
          </span>
        </div>

        {/* Step title + subtitle */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            {STEP_CONFIG[mobileStep].label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mobileStep === 0 && "Preencha os dados do seu cliente"}
            {mobileStep === 1 && "Escolha a piscina ideal"}
            {mobileStep === 2 && "Selecione os adicionais"}
            {mobileStep === 3 && "Confira e envie a proposta"}
          </p>
        </div>

        {/* Step content */}
        <div className="flex-1 min-h-0">
          {mobileStep === 0 && renderCustomerFields()}
          {mobileStep === 1 && renderModelFields()}
          {mobileStep === 2 && renderOptionalsContent(true)}
          {mobileStep === 3 && renderSummaryStep()}
        </div>

        {/* Bottom action button */}
        {mobileStep < 3 && (
          <div className="pt-6 pb-2 mt-auto">
            <button
              onClick={handleNextStep}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-primary/25"
            >
              Continuar
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
        {mobileStep === 3 && (
          <div className="pt-4 pb-2 mt-auto">
            <button
              onClick={() => setMobileStep((s) => s - 1)}
              className="w-full h-11 rounded-xl border border-border text-muted-foreground font-medium text-sm flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar e editar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout ──
  const renderModelGallery = () => {
    if (!selectedBrandId) {
      return (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
          <Waves className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Selecione uma marca</p>
          <p className="text-xs text-muted-foreground/70 mt-1">O catálogo de modelos aparecerá aqui</p>
        </div>
      );
    }
    if (filteredModels.length === 0) {
      return (
        <div className="h-full min-h-[300px] flex items-center justify-center text-center p-8 border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
          <p className="text-sm text-muted-foreground">Nenhum modelo disponível para esta marca/categoria</p>
        </div>
      );
    }
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredModels.map((m) => {
          const isSel = selectedModel?.id === m.id;
          const cat = categories.find((c) => c.id === m.category_id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setSelectedModel(m); setSelectedCategoryId(m.category_id); }}
              className={`group relative text-left rounded-2xl overflow-hidden border-2 transition-all bg-card ${
                isSel ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:shadow-md"
              }`}
            >
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    <Waves className="w-10 h-10" />
                  </div>
                )}
                {isSel && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold leading-tight line-clamp-1">{m.name}</p>
                {cat && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{cat.name}</p>}
                {m.length && m.width && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {m.length}m × {m.width}m{m.depth ? ` × ${m.depth}m` : ""}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">Dados do Cliente</CardTitle></CardHeader>
          <CardContent>{renderCustomerFields()}</CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">Modelo de Piscina</CardTitle></CardHeader>
          <CardContent>{renderModelFields()}</CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Catálogo</CardTitle>
            <p className="text-xs text-muted-foreground">Toque em um modelo para selecionar</p>
          </CardHeader>
          <CardContent>{renderModelGallery()}</CardContent>
        </Card>

        <Card className="lg:col-span-3">
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
          <Card className="lg:col-span-3">
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

        <Card className="lg:col-span-3">
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

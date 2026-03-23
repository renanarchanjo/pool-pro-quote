import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { Loader2, FileText, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
}

interface Category {
  id: string;
  name: string;
  brand_id: string | null;
}

const ManualProposal = () => {
  const { profile, store, storeSettings } = useStoreData();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showProposal, setShowProposal] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [modelOptionals, setModelOptionals] = useState<any[]>([]);
  const [optionalGroups, setOptionalGroups] = useState<{ id: string; name: string; description: string | null; display_order: number }[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<string[]>([]);
  const [selectedModelOptIds, setSelectedModelOptIds] = useState<string[]>([]);
  const [enabledOptionalIds, setEnabledOptionalIds] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerUf, setCustomerUf] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");

  useEffect(() => {
    if (profile?.store_id) loadData();
  }, [profile?.store_id]);

  // Enable all optionals by default when loaded
  useEffect(() => {
    setEnabledOptionalIds(optionals.map((o) => o.id));
  }, [optionals]);

  const loadData = async () => {
    try {
      const storeId = profile!.store_id!;
      const [brandRes, catRes, modRes, optRes, modelOptRes, groupsRes] = await Promise.all([
        supabase.from("brands").select("id, name").eq("store_id", storeId).eq("active", true).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("store_id", storeId).eq("active", true).order("name"),
        supabase.from("pool_models").select("*").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("optionals").select("*").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("model_optionals").select("*").eq("store_id", storeId).eq("active", true).order("display_order"),
        supabase.from("optional_groups").select("id, name, description, display_order").eq("store_id", storeId).eq("active", true).order("display_order"),
      ]);
      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);
      setModels(modRes.data || []);
      setOptionals(optRes.data || []);
      setModelOptionals(modelOptRes.data || []);
      setOptionalGroups(groupsRes.data || []);
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
  const totalPrice = (selectedModel?.base_price || 0) + optionalsTotal;

  const toggleEnabled = (id: string) => {
    setEnabledOptionalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    // Also deselect if disabling
    setSelectedOptionalIds((prev) => prev.filter((x) => x !== id || enabledOptionalIds.includes(id) === false));
  };

  const toggleOptional = (id: string) => {
    setSelectedOptionalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!customerName || !customerCity || !customerUf || !customerWhatsapp) {
      toast.error("Preencha todos os dados do cliente");
      return;
    }
    if (!selectedModel) {
      toast.error("Selecione um modelo de piscina");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("proposals").insert({
        customer_name: customerName,
        customer_city: `${customerCity} / ${customerUf}`,
        customer_whatsapp: customerWhatsapp,
        model_id: selectedModel.id,
        selected_optionals: selectedOptionalIds,
        total_price: totalPrice,
        store_id: profile!.store_id!,
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
        <ProposalView
          model={selectedModel}
          selectedOptionals={[...selectedOptionalsList, ...selectedModelOptsList.map((o: any) => ({ name: o.name, price: o.price }))]}
          customerData={{ name: customerName, city: `${customerCity} / ${customerUf}`, whatsapp: customerWhatsapp }}
          category={categories.find((c) => c.id === selectedModel.category_id)?.name || "Piscina"}
          onBack={handleReset}
          storeSettings={storeSettings}
          storeName={store?.name}
          storeCity={store?.city}
          storeState={store?.state}
        />
      </div>
    );
  }

  const allEnabled = enabledOptionalIds.length === optionals.length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Gerar Proposta
        </h1>
        <p className="text-muted-foreground mt-1">
          Crie uma proposta manual para clientes por indicação
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cname">Nome Completo *</Label>
              <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label htmlFor="cuf">Estado (UF) *</Label>
              <select
                id="cuf"
                value={customerUf}
                onChange={(e) => setCustomerUf(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione o estado</option>
                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ccity">Cidade *</Label>
              <Input id="ccity" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label htmlFor="cwhat">WhatsApp *</Label>
              <Input id="cwhat" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </CardContent>
        </Card>

        {/* Modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modelo de Piscina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Marca *</Label>
              <Select value={selectedBrandId} onValueChange={(v) => { setSelectedBrandId(v === "all" ? "" : v); setSelectedCategoryId(""); setSelectedModel(null); }}>
                <SelectTrigger><SelectValue placeholder="Selecione uma marca" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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
          </CardContent>
        </Card>

        {/* Opcionais */}
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
                  const groupOpts = optionals.filter((o) => o.group_id === group.id);
                  if (groupOpts.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <h4 className="text-sm font-bold text-foreground mb-1">{group.name}</h4>
                      {group.description && <p className="text-xs text-muted-foreground mb-2">{group.description}</p>}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {groupOpts.map((opt) => {
                          const isEnabled = enabledOptionalIds.includes(opt.id);
                          const isSelected = selectedOptionalIds.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                !isEnabled
                                  ? "border-border/30 bg-muted/30 opacity-50"
                                  : isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleEnabled(opt.id)}
                                className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
                                title={isEnabled ? "Desativar opcional" : "Ativar opcional"}
                              >
                                {isEnabled ? (
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>
                              <label className={`flex items-start gap-3 flex-1 min-w-0 ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => isEnabled && toggleOptional(opt.id)}
                                  disabled={!isEnabled}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0 pr-5">
                                  <p className="text-sm font-medium leading-tight">{opt.name}</p>
                                  <p className="text-xs text-primary font-semibold mt-1">
                                    + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Opcionais sem grupo */}
                {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-2">Outros</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {optionals.filter((o) => !o.group_id || !optionalGroups.some((g) => g.id === o.group_id)).map((opt) => {
                        const isEnabled = enabledOptionalIds.includes(opt.id);
                        const isSelected = selectedOptionalIds.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all ${
                              !isEnabled
                                ? "border-border/30 bg-muted/30 opacity-50"
                                : isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleEnabled(opt.id)}
                              className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
                              title={isEnabled ? "Desativar opcional" : "Ativar opcional"}
                            >
                              {isEnabled ? (
                                <Eye className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <label className={`flex items-start gap-3 flex-1 min-w-0 ${isEnabled ? "cursor-pointer" : "cursor-not-allowed"}`}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => isEnabled && toggleOptional(opt.id)}
                                disabled={!isEnabled}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0 pr-5">
                                <p className="text-sm font-medium leading-tight">{opt.name}</p>
                                <p className="text-xs text-primary font-semibold mt-1">
                                  + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opcionais Exclusivos do Modelo */}
        {selectedModel && currentModelOpts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Opcionais Exclusivos — {selectedModel.name}</CardTitle>
              <p className="text-xs text-muted-foreground">Opcionais específicos calculados para este modelo</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentModelOpts.map((opt: any) => {
                  const isSelected = selectedModelOptIds.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => setSelectedModelOptIds((prev) => prev.includes(opt.id) ? prev.filter((x: string) => x !== opt.id) : [...prev, opt.id])}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{opt.name}</p>
                        {opt.description && <p className="text-xs text-muted-foreground">{opt.description}</p>}
                        <p className="text-xs text-primary font-semibold mt-1">
                          + R$ {opt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
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

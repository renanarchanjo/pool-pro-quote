import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Loader2, X, Trash2, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useStoreData } from "@/hooks/useStoreData";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  brand_id: string | null;
}

interface PoolModel {
  id: string;
  category_id: string;
  name: string;
  length: number | null;
  width: number | null;
  depth: number | null;
  photo_url: string | null;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  cost: number;
  margin_percent: number;
  delivery_days: number;
  installation_days: number;
  payment_terms: string;
  notes: string | null;
  active: boolean;
}

const PoolModelManager = () => {
  const { store } = useStoreData();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    length: "",
    width: "",
    depth: "",
    photo_url: "",
    cost: "",
    margin_percent: "",
    base_price: "",
    delivery_days: "30",
    installation_days: "5",
    payment_terms: "À vista",
    notes: "",
    differentials: [] as string[],
    included_items: [] as string[],
    not_included_items: [] as string[],
    newDifferential: "",
    newIncluded: "",
    newNotIncluded: "",
  });

  useEffect(() => {
    if (store) {
      loadData();
    }
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    
    try {
      const [brandsRes, categoriesRes, modelsRes] = await Promise.all([
        supabase.from("brands").select("id, name").eq("active", true).eq("store_id", store.id),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).eq("store_id", store.id),
        supabase.from("pool_models").select("*").eq("store_id", store.id).order("created_at", { ascending: false })
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (modelsRes.error) throw modelsRes.error;

      setBrands(brandsRes.data || []);
      setCategories(categoriesRes.data || []);
      setModels(modelsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const getBrandName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat?.brand_id) return "";
    const brand = brands.find((b) => b.id === cat.brand_id);
    return brand?.name || "";
  };

  const addToArray = (field: "differentials" | "included_items" | "not_included_items", inputField: string) => {
    const value = formData[inputField as keyof typeof formData] as string;
    if (!value.trim()) return;

    setFormData({
      ...formData,
      [field]: [...formData[field], value.trim()],
      [inputField]: "",
    });
  };

  const removeFromArray = (field: "differentials" | "included_items" | "not_included_items", index: number) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.category_id || !formData.base_price) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!store) {
      toast.error("Loja não encontrada");
      return;
    }

    try {
      const data = {
        category_id: formData.category_id,
        name: formData.name,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        depth: formData.depth ? parseFloat(formData.depth) : null,
        photo_url: formData.photo_url || null,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        margin_percent: formData.margin_percent ? parseFloat(formData.margin_percent) : 0,
        base_price: parseFloat(formData.base_price),
        delivery_days: parseInt(formData.delivery_days),
        installation_days: parseInt(formData.installation_days),
        payment_terms: formData.payment_terms,
        notes: formData.notes || null,
        differentials: formData.differentials,
        included_items: formData.included_items,
        not_included_items: formData.not_included_items,
        ...(editing ? {} : { store_id: store.id }),
      };

      if (editing) {
        const { error } = await supabase
          .from("pool_models")
          .update(data)
          .eq("id", editing);

        if (error) throw error;
        toast.success("Modelo atualizado");
      } else {
        const { error } = await supabase.from("pool_models").insert(data);
        if (error) throw error;
        toast.success("Modelo criado");
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving model:", error);
      toast.error("Erro ao salvar modelo");
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: "",
      name: "",
      length: "",
      width: "",
      depth: "",
      photo_url: "",
      cost: "",
      margin_percent: "",
      base_price: "",
      delivery_days: "30",
      installation_days: "5",
      payment_terms: "À vista",
      notes: "",
      differentials: [],
      included_items: [],
      not_included_items: [],
      newDifferential: "",
      newIncluded: "",
      newNotIncluded: "",
    });
    setEditing(null);
  };

  const handleEdit = (model: PoolModel) => {
    setEditing(model.id);
    setFormData({
      category_id: model.category_id,
      name: model.name,
      length: model.length?.toString() || "",
      width: model.width?.toString() || "",
      depth: model.depth?.toString() || "",
      photo_url: model.photo_url || "",
      cost: model.cost?.toString() || "",
      margin_percent: model.margin_percent?.toString() || "",
      base_price: model.base_price.toString(),
      delivery_days: model.delivery_days.toString(),
      installation_days: model.installation_days.toString(),
      payment_terms: model.payment_terms || "À vista",
      notes: model.notes || "",
      differentials: model.differentials || [],
      included_items: model.included_items || [],
      not_included_items: model.not_included_items || [],
      newDifferential: "",
      newIncluded: "",
      newNotIncluded: "",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("pool_models").delete().eq("id", id);
      if (error) throw error;
      toast.success("Modelo excluído");
      loadData();
    } catch (error) {
      console.error("Error deleting model:", error);
      toast.error("Erro ao excluir modelo. Verifique se não há propostas vinculadas.");
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("pool_models")
        .update({ active: !active })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status atualizado");
      loadData();
    } catch (error) {
      console.error("Error updating model:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const toggleSelectModel = (id: string) => {
    setSelectedModels((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAllModels = () => {
    setSelectedModels(selectedModels.length === models.length ? [] : models.map((m) => m.id));
  };

  const bulkModelAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedModels.length === 0) return;
    try {
      if (action === "delete") {
        for (const id of selectedModels) {
          await supabase.from("pool_models").delete().eq("id", id);
        }
        toast.success(`${selectedModels.length} modelo(s) excluído(s)`);
      } else {
        const active = action === "activate";
        for (const id of selectedModels) {
          await supabase.from("pool_models").update({ active }).eq("id", id);
        }
        toast.success(`${selectedModels.length} modelo(s) ${active ? "ativado(s)" : "desativado(s)"}`);
      }
      setSelectedModels([]);
      loadData();
    } catch {
      toast.error("Erro na operação em lote");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          {editing ? "Editar Modelo" : "Novo Modelo"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria (Marca) *</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => {
                    const brandName = getBrandName(cat.id);
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}{brandName ? ` — ${brandName}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Nome do Modelo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Modelo Premium 8x4"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Comprimento (m)</Label>
              <Input
                id="length"
                type="number"
                step="0.01"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                placeholder="Ex: 8.00"
              />
            </div>
            <div>
              <Label htmlFor="width">Largura (m)</Label>
              <Input
                id="width"
                type="number"
                step="0.01"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder="Ex: 4.00"
              />
            </div>
            <div>
              <Label htmlFor="depth">Profundidade (m)</Label>
              <Input
                id="depth"
                type="number"
                step="0.01"
                value={formData.depth}
                onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                placeholder="Ex: 1.40"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="photo">URL da Foto</Label>
            <Input
              id="photo"
              type="url"
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
              placeholder="https://exemplo.com/foto-piscina.jpg"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cost">Custo (R$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => {
                  const cost = e.target.value;
                  const margin = formData.margin_percent;
                  const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : formData.base_price;
                  setFormData({ ...formData, cost, base_price: price });
                }}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="margin">Margem (%)</Label>
              <Input
                id="margin"
                type="number"
                step="0.1"
                value={formData.margin_percent}
                onChange={(e) => {
                  const margin = e.target.value;
                  const cost = formData.cost;
                  const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : formData.base_price;
                  setFormData({ ...formData, margin_percent: margin, base_price: price });
                }}
                placeholder="Ex: 30"
              />
            </div>
            <div>
              <Label htmlFor="price">Preço de Venda (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                placeholder="0.00"
              />
              {formData.cost && parseFloat(formData.cost) > 0 && formData.base_price && parseFloat(formData.base_price) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Lucro: R$ {(parseFloat(formData.base_price) - parseFloat(formData.cost)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  {" "}({(((parseFloat(formData.base_price) - parseFloat(formData.cost)) / parseFloat(formData.cost)) * 100).toFixed(1)}%)
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery">Prazo Entrega (dias)</Label>
              <Input
                id="delivery"
                type="number"
                value={formData.delivery_days}
                onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="installation">Prazo Instalação (dias)</Label>
              <Input
                id="installation"
                type="number"
                value={formData.installation_days}
                onChange={(e) => setFormData({ ...formData, installation_days: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="payment">Forma de Pagamento</Label>
            <Input
              id="payment"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="Ex: À vista, Parcelado, Financiamento"
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações Gerais</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre o modelo..."
              rows={4}
            />
          </div>

          <div>
            <Label>Diferenciais</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={formData.newDifferential}
                onChange={(e) => setFormData({ ...formData, newDifferential: e.target.value })}
                placeholder="Ex: Acabamento premium"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("differentials", "newDifferential"))}
              />
              <Button type="button" onClick={() => addToArray("differentials", "newDifferential")}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.differentials.map((item, idx) => (
                <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray("differentials", idx)}>
                  {item} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Itens Inclusos</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={formData.newIncluded}
                onChange={(e) => setFormData({ ...formData, newIncluded: e.target.value })}
                placeholder="Ex: Filtro e bomba"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("included_items", "newIncluded"))}
              />
              <Button type="button" onClick={() => addToArray("included_items", "newIncluded")}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.included_items.map((item, idx) => (
                <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray("included_items", idx)}>
                  {item} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Itens Não Inclusos</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={formData.newNotIncluded}
                onChange={(e) => setFormData({ ...formData, newNotIncluded: e.target.value })}
                placeholder="Ex: Aquecedor solar"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("not_included_items", "newNotIncluded"))}
              />
              <Button type="button" onClick={() => addToArray("not_included_items", "newNotIncluded")}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.not_included_items.map((item, idx) => (
                <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray("not_included_items", idx)}>
                  {item} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="gradient-primary text-white">
              {editing ? "Atualizar" : "Criar"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterBrand} onValueChange={(v) => { setFilterBrand(v); setFilterCategory("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Marcas</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {(filterBrand === "all" ? categories : categories.filter((c) => c.brand_id === filterBrand)).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Desativados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={selectAllModels}>
          {selectedModels.length === models.length ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
          {selectedModels.length === models.length ? "Desmarcar" : "Selecionar"} todos
        </Button>
      </div>

      {selectedModels.length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium">{selectedModels.length} modelo(s) selecionado(s)</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkModelAction("activate")}>Ativar</Button>
              <Button size="sm" variant="outline" onClick={() => bulkModelAction("deactivate")}>Desativar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedModels.length} modelo(s)?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkModelAction("delete")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      )}

      {(() => {
        let filtered = models;
        if (filterCategory !== "all") {
          filtered = filtered.filter((m) => m.category_id === filterCategory);
        } else if (filterBrand !== "all") {
          const brandCatIds = categories.filter((c) => c.brand_id === filterBrand).map((c) => c.id);
          filtered = filtered.filter((m) => brandCatIds.includes(m.category_id));
        }

        if (filtered.length === 0) {
          return <p className="text-muted-foreground text-center py-8">Nenhum modelo encontrado.</p>;
        }

        return (
          <div className="grid gap-3">
            {filtered.map((model) => {
              const isExpanded = expandedModel === model.id;
              const brandName = getBrandName(model.category_id);
              const catName = categories.find((c) => c.id === model.category_id)?.name || "Sem categoria";

              return (
                <Card key={model.id} className={`transition-colors ${selectedModels.includes(model.id) ? "ring-2 ring-primary/30" : ""}`}>
                  {/* Collapsed row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedModel(isExpanded ? null : model.id)}
                  >
                    <Checkbox
                      checked={selectedModels.includes(model.id)}
                      onCheckedChange={(e) => { e && e; toggleSelectModel(model.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{model.name}</h3>
                      {brandName && <Badge variant="outline" className="text-xs">{brandName}</Badge>}
                      <Badge variant="secondary" className="text-xs">{catName}</Badge>
                    </div>
                    <span className="font-bold text-primary whitespace-nowrap">
                      R$ {model.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={model.active} onCheckedChange={() => toggleActive(model.id, model.active)} />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir "{model.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(model.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3">
                      {model.cost > 0 && (
                        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap pt-3">
                          <span>Custo: R$ {model.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          <span>Margem: {model.margin_percent}%</span>
                          <span className="text-emerald-600 font-medium">
                            Lucro: R$ {(model.base_price - model.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {(model.length || model.width || model.depth) && (
                        <p className="text-sm text-muted-foreground">
                          Dimensões: {model.length}m × {model.width}m × {model.depth}m
                        </p>
                      )}
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>Entrega: {model.delivery_days}d | Instalação: {model.installation_days}d</div>
                        {model.payment_terms && <div>Pagamento: {model.payment_terms}</div>}
                      </div>
                      {model.differentials?.length > 0 && (
                        <div>
                          <span className="font-semibold text-sm">Diferenciais:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {model.differentials.map((d, i) => <Badge key={i} variant="secondary">{d}</Badge>)}
                          </div>
                        </div>
                      )}
                      {model.notes && (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <span className="font-semibold text-sm">Observações:</span>
                          <p className="text-sm mt-1">{model.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

export default PoolModelManager;

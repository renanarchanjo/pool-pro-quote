import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
}

interface PoolModel {
  id: string;
  category_id: string;
  name: string;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
  active: boolean;
}

const PoolModelManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    base_price: "",
    delivery_days: "30",
    installation_days: "5",
    differentials: [] as string[],
    included_items: [] as string[],
    not_included_items: [] as string[],
    newDifferential: "",
    newIncluded: "",
    newNotIncluded: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, modelsRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("active", true),
        supabase.from("pool_models").select("*").order("created_at", { ascending: false })
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (modelsRes.error) throw modelsRes.error;

      setCategories(categoriesRes.data || []);
      setModels(modelsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
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

    try {
      const data = {
        category_id: formData.category_id,
        name: formData.name,
        base_price: parseFloat(formData.base_price),
        delivery_days: parseInt(formData.delivery_days),
        installation_days: parseInt(formData.installation_days),
        differentials: formData.differentials,
        included_items: formData.included_items,
        not_included_items: formData.not_included_items,
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
      base_price: "",
      delivery_days: "30",
      installation_days: "5",
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
      base_price: model.base_price.toString(),
      delivery_days: model.delivery_days.toString(),
      installation_days: model.installation_days.toString(),
      differentials: model.differentials || [],
      included_items: model.included_items || [],
      not_included_items: model.not_included_items || [],
      newDifferential: "",
      newIncluded: "",
      newNotIncluded: "",
    });
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
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
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
              <Label htmlFor="price">Preço Base (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
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

      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{model.name}</h3>
                <p className="text-2xl font-bold text-primary mt-1">
                  R$ {model.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={model.active}
                    onCheckedChange={() => toggleActive(model.id, model.active)}
                  />
                  <span className="text-sm">
                    {model.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(model)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {model.differentials?.length > 0 && (
              <div className="mb-3">
                <span className="font-semibold text-sm">Diferenciais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {model.differentials.map((d, i) => (
                    <Badge key={i} variant="secondary">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Entrega: {model.delivery_days}d | Instalação: {model.installation_days}d
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PoolModelManager;

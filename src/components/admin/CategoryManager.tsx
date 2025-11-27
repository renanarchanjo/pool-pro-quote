import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

const CategoryManager = () => {
  const { store } = useStoreData();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (store) {
      loadCategories();
    }
  }, [store]);

  const loadCategories = async () => {
    if (!store) return;
    
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!store) {
      toast.error("Loja não encontrada");
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("categories")
          .update({ name: formData.name, description: formData.description })
          .eq("id", editing);

        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ 
            name: formData.name, 
            description: formData.description,
            store_id: store.id
          });

        if (error) throw error;
        toast.success("Categoria criada");
      }

      setFormData({ name: "", description: "" });
      setEditing(null);
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleEdit = (category: Category) => {
    setEditing(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ active: !active })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status atualizado");
      loadCategories();
    } catch (error) {
      console.error("Error updating category:", error);
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
          {editing ? "Editar Categoria" : "Nova Categoria"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Piscinas Residenciais"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição da categoria"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Atualizar" : "Criar"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setFormData({ name: "", description: "" });
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{category.name}</h3>
                {category.description && (
                  <p className="text-muted-foreground">{category.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.active}
                    onCheckedChange={() => toggleActive(category.id, category.active)}
                  />
                  <span className="text-sm">
                    {category.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Optional {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
}

const OptionalManager = () => {
  const { store } = useStoreData();
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", price: "" });

  useEffect(() => {
    if (store) loadOptionals();
  }, [store]);

  const loadOptionals = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase.from("optionals")
        .select("*").eq("store_id", store.id).order("created_at", { ascending: false });
      if (error) throw error;
      setOptionals(data || []);
    } catch (error) {
      console.error("Error loading optionals:", error);
      toast.error("Erro ao carregar opcionais");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) { toast.error("Nome e preço são obrigatórios"); return; }
    if (!store) { toast.error("Loja não encontrada"); return; }

    try {
      const data = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price),
        ...(editing ? {} : { store_id: store.id }),
      };

      if (editing) {
        const { error } = await supabase.from("optionals").update(data).eq("id", editing);
        if (error) throw error;
        toast.success("Opcional atualizado");
      } else {
        const { error } = await supabase.from("optionals").insert(data);
        if (error) throw error;
        toast.success("Opcional criado");
      }
      setFormData({ name: "", description: "", price: "" });
      setEditing(null);
      loadOptionals();
    } catch (error) {
      console.error("Error saving optional:", error);
      toast.error("Erro ao salvar opcional");
    }
  };

  const handleEdit = (optional: Optional) => {
    setEditing(optional.id);
    setFormData({ name: optional.name, description: optional.description || "", price: optional.price.toString() });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("optionals").delete().eq("id", id);
      if (error) throw error;
      toast.success("Opcional excluído");
      loadOptionals();
    } catch (error) {
      console.error("Error deleting optional:", error);
      toast.error("Erro ao excluir opcional");
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("optionals").update({ active: !active }).eq("id", id);
      if (error) throw error;
      toast.success("Status atualizado");
      loadOptionals();
    } catch (error) {
      console.error("Error updating optional:", error);
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
          {editing ? "Editar Opcional" : "Novo Opcional"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: LEDs RGB" />
            </div>
            <div>
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input id="price" type="number" step="0.01" value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do opcional" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Atualizar" : "Criar"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => {
                setEditing(null);
                setFormData({ name: "", description: "", price: "" });
              }}>Cancelar</Button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {optionals.map((optional) => (
          <Card key={optional.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{optional.name}</h3>
                <p className="text-2xl font-bold text-primary mb-2">
                  R$ {optional.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                {optional.description && (
                  <p className="text-sm text-muted-foreground">{optional.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={optional.active}
                    onCheckedChange={() => toggleActive(optional.id, optional.active)} />
                  <span className="text-sm">{optional.active ? "Ativo" : "Inativo"}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(optional)}>
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
                        <AlertDialogTitle>Excluir opcional?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir "{optional.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(optional.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OptionalManager;

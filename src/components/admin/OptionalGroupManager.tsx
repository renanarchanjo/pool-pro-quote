import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Loader2, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OptionalGroup {
  id: string;
  name: string;
  description: string | null;
  selection_type: "single" | "multiple";
  display_order: number;
  active: boolean;
}

const OptionalGroupManager = () => {
  const { store } = useStoreData();
  const [groups, setGroups] = useState<OptionalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "",
    selection_type: "multiple" as "single" | "multiple",
    display_order: 0,
  });

  useEffect(() => {
    if (store) loadGroups();
  }, [store]);

  const loadGroups = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase.from("optional_groups")
        .select("*").eq("store_id", store.id).order("display_order", { ascending: true });
      if (error) throw error;
      setGroups((data as OptionalGroup[]) || []);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!store) { toast.error("Loja não encontrada"); return; }

    try {
      if (editing) {
        const { error } = await supabase.from("optional_groups").update({
          name: formData.name, description: formData.description,
          selection_type: formData.selection_type, display_order: formData.display_order,
        }).eq("id", editing);
        if (error) throw error;
        toast.success("Grupo atualizado");
      } else {
        const { error } = await supabase.from("optional_groups").insert({
          name: formData.name, description: formData.description,
          selection_type: formData.selection_type, display_order: formData.display_order,
          store_id: store.id,
        });
        if (error) throw error;
        toast.success("Grupo criado");
      }
      setFormData({ name: "", description: "", selection_type: "multiple", display_order: 0 });
      setEditing(null);
      loadGroups();
    } catch (error) {
      console.error("Error saving group:", error);
      toast.error("Erro ao salvar grupo");
    }
  };

  const handleEdit = (group: OptionalGroup) => {
    setEditing(group.id);
    setFormData({
      name: group.name, description: group.description || "",
      selection_type: group.selection_type, display_order: group.display_order,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("optional_groups").delete().eq("id", id);
      if (error) throw error;
      toast.success("Grupo excluído");
      loadGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Erro ao excluir grupo. Verifique se não há opcionais vinculados.");
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("optional_groups").update({ active: !active }).eq("id", id);
      if (error) throw error;
      toast.success("Status atualizado");
      loadGroups();
    } catch (error) {
      console.error("Error updating group:", error);
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
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-display font-bold">Grupos de Opcionais</h2>
      </div>

      <Card className="p-6 shadow-card">
        <h3 className="text-lg font-display font-semibold mb-4">
          {editing ? "Editar Grupo" : "Novo Grupo"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Grupo *</Label>
              <Input id="name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Iluminação" />
            </div>
            <div>
              <Label htmlFor="selection_type">Tipo de Seleção *</Label>
              <Select value={formData.selection_type}
                onValueChange={(v: "single" | "multiple") => setFormData({ ...formData, selection_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="single">Seleção Única</SelectItem>
                  <SelectItem value="multiple">Seleção Múltipla</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do grupo" rows={2} />
          </div>
          <div>
            <Label htmlFor="display_order">Ordem de Exibição</Label>
            <Input id="display_order" type="number" value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-primary text-white font-display">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Atualizar" : "Criar"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => {
                setEditing(null);
                setFormData({ name: "", description: "", selection_type: "multiple", display_order: 0 });
              }}>Cancelar</Button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="p-6 shadow-card border-border/50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-display font-semibold">{group.name}</h3>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    group.selection_type === "single"
                      ? "bg-accent/20 text-accent-foreground"
                      : "bg-secondary/20 text-secondary-foreground"
                  }`}>
                    {group.selection_type === "single" ? "Seleção Única" : "Seleção Múltipla"}
                  </span>
                  <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
                    Ordem: {group.display_order}
                  </span>
                </div>
                {group.description && (
                  <p className="text-muted-foreground text-sm">{group.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={group.active}
                    onCheckedChange={() => toggleActive(group.id, group.active)} />
                  <span className="text-sm">{group.active ? "Ativo" : "Inativo"}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
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
                      <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir "{group.name}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(group.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OptionalGroupManager;

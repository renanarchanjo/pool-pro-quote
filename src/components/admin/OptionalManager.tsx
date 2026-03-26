import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Loader2, Trash2, CheckSquare, Square } from "lucide-react";
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
  cost: number;
  margin_percent: number;
  active: boolean;
  group_id: string | null;
}

interface OptionalGroup {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

const OptionalManager = () => {
  const { store } = useStoreData();
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [groups, setGroups] = useState<OptionalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", price: "", cost: "", margin_percent: "", group_id: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);

  useEffect(() => {
    if (store) loadData();
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [optRes, groupRes] = await Promise.all([
        supabase.from("optionals").select("*").eq("store_id", store.id).order("display_order"),
        supabase.from("optional_groups").select("id, name, description, display_order").eq("store_id", store.id).eq("active", true).order("display_order"),
      ]);
      if (optRes.error) throw optRes.error;
      setOptionals(optRes.data || []);
      setGroups(groupRes.data || []);
    } catch {
      toast.error("Erro ao carregar opcionais");
    } finally {
      setLoading(false);
    }
  };
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !store) return;
    try {
      const { error } = await supabase.from("optional_groups").insert({
        name: newGroupName.trim(),
        store_id: store.id,
        selection_type: "multiple",
        display_order: groups.length + 1,
      });
      if (error) throw error;
      toast.success("Grupo criado");
      setNewGroupName("");
      setShowGroupForm(false);
      loadData();
    } catch {
      toast.error("Erro ao criar grupo");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Move optionals from this group to ungrouped
      await supabase.from("optionals").update({ group_id: null }).eq("group_id", groupId);
      await supabase.from("optional_groups").delete().eq("id", groupId);
      toast.success("Grupo excluído");
      loadData();
    } catch {
      toast.error("Erro ao excluir grupo");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelected(selected.length === optionals.length ? [] : optionals.map((o) => o.id));
  };

  const bulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selected.length === 0) return;
    try {
      if (action === "delete") {
        for (const id of selected) {
          await supabase.from("optionals").delete().eq("id", id);
        }
        toast.success(`${selected.length} opcional(is) excluído(s)`);
      } else {
        const active = action === "activate";
        for (const id of selected) {
          await supabase.from("optionals").update({ active }).eq("id", id);
        }
        toast.success(`${selected.length} opcional(is) ${active ? "ativado(s)" : "desativado(s)"}`);
      }
      setSelected([]);
      loadData();
    } catch {
      toast.error("Erro na operação em lote");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) { toast.error("Nome e preço são obrigatórios"); return; }
    if (!store) return;
    try {
      const data = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        margin_percent: formData.margin_percent ? parseFloat(formData.margin_percent) : 0,
        group_id: formData.group_id || null,
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
      setFormData({ name: "", description: "", price: "", cost: "", margin_percent: "", group_id: "" });
      setEditing(null);
      loadData();
    } catch {
      toast.error("Erro ao salvar opcional");
    }
  };

  const handleEdit = (o: Optional) => {
    setEditing(o.id);
    setFormData({ name: o.name, description: o.description || "", price: o.price.toString(), cost: o.cost?.toString() || "", margin_percent: o.margin_percent?.toString() || "", group_id: o.group_id || "" });
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("optionals").delete().eq("id", id);
      toast.success("Opcional excluído");
      loadData();
    } catch {
      toast.error("Erro ao excluir opcional");
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await supabase.from("optionals").update({ active: !active }).eq("id", id);
      toast.success("Status atualizado");
      loadData();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const renderOptionalCard = (optional: Optional) => (
    <Card
      key={optional.id}
      className={`p-4 transition-all cursor-pointer ${selected.includes(optional.id) ? "ring-2 ring-primary/30 border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
      onClick={() => toggleSelect(optional.id)}
    >
      <div className="flex gap-3">
        <Checkbox
          checked={selected.includes(optional.id)}
          className="mt-1 shrink-0 pointer-events-none"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{optional.name}</h3>
              <p className="text-xl font-bold text-primary mb-1">
                R$ {optional.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              {optional.cost > 0 && (
                <div className="flex gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                  <span>Custo: R$ {optional.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span>Margem: {optional.margin_percent}%</span>
                  <span className="text-emerald-600 font-medium">
                    Lucro: R$ {(optional.price - optional.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {optional.description && (
                <p className="text-sm text-muted-foreground">{optional.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Switch checked={optional.active}
                  onCheckedChange={() => toggleActive(optional.id, optional.active)} />
                <span className="text-xs">{optional.active ? "Ativo" : "Inativo"}</span>
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
                      <AlertDialogDescription>Excluir "{optional.name}"?</AlertDialogDescription>
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
        </div>
      </div>
    </Card>
  );

  const ungroupedOptionals = optionals.filter((o) => !o.group_id || !groups.some((g) => g.id === o.group_id));

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Grupos de Opcionais</h2>
          <Button variant="outline" size="sm" onClick={() => setShowGroupForm(!showGroupForm)}>
            <Plus className="w-4 h-4 mr-1" /> Novo Grupo
          </Button>
        </div>
        {showGroupForm && (
          <div className="flex gap-2 mb-4">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do novo grupo"
              className="max-w-xs"
            />
            <Button size="sm" className="gradient-primary text-white" onClick={handleCreateGroup}>Criar</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowGroupForm(false); setNewGroupName(""); }}>Cancelar</Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center gap-1 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
              <span className="font-medium">{g.name}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({optionals.filter((o) => o.group_id === g.id).length})
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="ml-1 p-0.5 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir grupo "{g.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>Os opcionais deste grupo ficarão sem grupo.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteGroup(g.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          {editing ? "Editar Opcional" : "Novo Opcional"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="group">Grupo</Label>
              <Select value={formData.group_id} onValueChange={(v) => setFormData({ ...formData, group_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem grupo</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: LEDs RGB" />
            </div>
            <div>
              <Label htmlFor="cost">Custo (R$)</Label>
              <Input id="cost" type="number" step="0.01" value={formData.cost}
                onChange={(e) => {
                  const cost = e.target.value;
                  const margin = formData.margin_percent;
                  const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : formData.price;
                  setFormData({ ...formData, cost, price });
                }}
                placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="margin">Margem (%)</Label>
              <Input id="margin" type="number" step="0.1" value={formData.margin_percent}
                onChange={(e) => {
                  const margin = e.target.value;
                  const cost = formData.cost;
                  const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : formData.price;
                  setFormData({ ...formData, margin_percent: margin, price });
                }}
                placeholder="Ex: 30" />
            </div>
            <div>
              <Label htmlFor="price">Preço de Venda (R$) *</Label>
              <Input id="price" type="number" step="0.01" value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00" />
              {formData.cost && parseFloat(formData.cost) > 0 && formData.price && parseFloat(formData.price) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Lucro: R$ {(parseFloat(formData.price) - parseFloat(formData.cost)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              )}
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
                setFormData({ name: "", description: "", price: "", cost: "", margin_percent: "", group_id: "" });
              }}>Cancelar</Button>
            )}
          </div>
        </form>
      </Card>

      {/* Bulk actions header */}
      {optionals.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.length === optionals.length ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
            {selected.length === optionals.length ? "Desmarcar" : "Selecionar"} todos
          </Button>
        </div>
      )}

      {/* Bulk actions bar */}
      {selected.length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium">{selected.length} opcional(is) selecionado(s)</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkAction("activate")}>Ativar</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("deactivate")}>Desativar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selected.length} opcional(is)?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkAction("delete")}
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

      {/* Optionals organized by group */}
      <div className="space-y-6">
        {groups.map((group) => {
          const groupOpts = optionals.filter((o) => o.group_id === group.id).sort((a, b) => a.price - b.price);
          if (groupOpts.length === 0) return null;
          return (
            <div key={group.id}>
              <h3 className="text-lg font-bold text-foreground mb-1">{group.name}</h3>
              {group.description && <p className="text-sm text-muted-foreground mb-3">{group.description}</p>}
              <div className="grid md:grid-cols-2 gap-4">
                {groupOpts.map(renderOptionalCard)}
              </div>
            </div>
          );
        })}

        {ungroupedOptionals.length > 0 && (
          <div>
            {groups.length > 0 && <h3 className="text-lg font-bold text-foreground mb-1">Outros</h3>}
            <div className="grid md:grid-cols-2 gap-4">
              {ungroupedOptionals.map(renderOptionalCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionalManager;

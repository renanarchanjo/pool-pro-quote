import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Loader2, Trash2, ChevronDown, ChevronRight, Tag } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  brand_id: string | null;
}

const BrandCategoryManager = () => {
  const { store } = useStoreData();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Brand form
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });

  // Category form
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", brand_id: "" });

  // Collapsible state
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);

  useEffect(() => {
    if (store) loadData();
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [brandsRes, catsRes] = await Promise.all([
        supabase.from("brands").select("*").eq("store_id", store.id).order("name"),
        supabase.from("categories").select("*").eq("store_id", store.id).order("name"),
      ]);
      if (brandsRes.error) throw brandsRes.error;
      if (catsRes.error) throw catsRes.error;
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedBrands((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ---- BRAND CRUD ----
  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) { toast.error("Nome da marca é obrigatório"); return; }
    if (!store) return;

    try {
      if (editingBrand) {
        const { error } = await supabase.from("brands")
          .update({ name: brandForm.name, description: brandForm.description || null })
          .eq("id", editingBrand);
        if (error) throw error;
        toast.success("Marca atualizada");
      } else {
        const { error } = await supabase.from("brands")
          .insert({ name: brandForm.name, description: brandForm.description || null, store_id: store.id });
        if (error) throw error;
        toast.success("Marca criada");
      }
      setBrandForm({ name: "", description: "" });
      setEditingBrand(null);
      loadData();
    } catch (error) {
      console.error("Error saving brand:", error);
      toast.error("Erro ao salvar marca");
    }
  };

  const handleDeleteBrand = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Marca excluída");
      loadData();
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error("Erro ao excluir marca. Verifique se não há categorias vinculadas.");
    }
  };

  const toggleBrandActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("brands").update({ active: !active }).eq("id", id);
      if (error) throw error;
      toast.success("Status atualizado");
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  // ---- CATEGORY CRUD ----
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) { toast.error("Nome da categoria é obrigatório"); return; }
    if (!categoryForm.brand_id) { toast.error("Selecione uma marca"); return; }
    if (!store) return;

    try {
      if (editingCategory) {
        const { error } = await supabase.from("categories")
          .update({ name: categoryForm.name, description: categoryForm.description || null, brand_id: categoryForm.brand_id })
          .eq("id", editingCategory);
        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const { error } = await supabase.from("categories")
          .insert({ name: categoryForm.name, description: categoryForm.description || null, brand_id: categoryForm.brand_id, store_id: store.id });
        if (error) throw error;
        toast.success("Categoria criada");
      }
      setCategoryForm({ name: "", description: "", brand_id: "" });
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída");
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir. Verifique se não há modelos vinculados.");
    }
  };

  const toggleCategoryActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("categories").update({ active: !active }).eq("id", id);
      if (error) throw error;
      toast.success("Status atualizado");
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getCategoriesForBrand = (brandId: string) =>
    categories.filter((c) => c.brand_id === brandId);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ====== MARCA FORM ====== */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          {editingBrand ? "Editar Marca" : "Nova Marca"}
        </h2>
        <form onSubmit={handleBrandSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand-name">Nome da Marca *</Label>
              <Input id="brand-name" value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                placeholder="Ex: iGUi, Splash, Rio Piscinas" />
            </div>
            <div>
              <Label htmlFor="brand-desc">Descrição</Label>
              <Input id="brand-desc" value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                placeholder="Descrição da marca" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              {editingBrand ? "Atualizar Marca" : "Criar Marca"}
            </Button>
            {editingBrand && (
              <Button type="button" variant="outline" onClick={() => {
                setEditingBrand(null);
                setBrandForm({ name: "", description: "" });
              }}>Cancelar</Button>
            )}
          </div>
        </form>
      </Card>

      {/* ====== CATEGORIA FORM ====== */}
      {brands.length > 0 && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {editingCategory ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Marca *</Label>
                <Select value={categoryForm.brand_id} onValueChange={(v) => setCategoryForm({ ...categoryForm, brand_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                  <SelectContent>
                    {brands.filter((b) => b.active).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cat-name">Nome da Categoria *</Label>
                <Input id="cat-name" value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ex: Piscinas Residenciais" />
              </div>
              <div>
                <Label htmlFor="cat-desc">Descrição</Label>
                <Input id="cat-desc" value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Descrição da categoria" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                {editingCategory ? "Atualizar Categoria" : "Criar Categoria"}
              </Button>
              {editingCategory && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: "", description: "", brand_id: "" });
                }}>Cancelar</Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* ====== LISTAGEM DE MARCAS COM CATEGORIAS ====== */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Marcas e Categorias Cadastradas</h2>

        {brands.length === 0 ? (
          <Card className="p-8 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma marca cadastrada ainda. Comece criando uma marca acima.</p>
          </Card>
        ) : (
          brands.map((brand) => {
            const brandCategories = getCategoriesForBrand(brand.id);
            const isExpanded = expandedBrands.includes(brand.id);

            return (
              <Collapsible key={brand.id} open={isExpanded} onOpenChange={() => toggleExpanded(brand.id)}>
                <Card className="overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5" />}
                      <div>
                        <h3 className="text-lg font-bold">{brand.name}</h3>
                        {brand.description && (
                          <p className="text-sm text-muted-foreground">{brand.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {brandCategories.length} categoria{brandCategories.length !== 1 ? "s" : ""}
                      </Badge>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={brand.active} onCheckedChange={() => toggleBrandActive(brand.id, brand.active)} />
                        <span className="text-sm">{brand.active ? "Ativo" : "Inativo"}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingBrand(brand.id);
                        setBrandForm({ name: brand.name, description: brand.description || "" });
                      }}>
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
                            <AlertDialogTitle>Excluir marca?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir "{brand.name}"? Todas as categorias vinculadas também serão excluídas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteBrand(brand.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-border/50 p-4 bg-muted/20 space-y-2">
                      {brandCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">
                          Nenhuma categoria nesta marca. Crie uma acima selecionando esta marca.
                        </p>
                      ) : (
                        brandCategories.map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50">
                            <div>
                              <p className="font-medium">{cat.name}</p>
                              {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={cat.active} onCheckedChange={() => toggleCategoryActive(cat.id, cat.active)} />
                              <span className="text-xs">{cat.active ? "Ativo" : "Inativo"}</span>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingCategory(cat.id);
                                setCategoryForm({ name: cat.name, description: cat.description || "", brand_id: cat.brand_id || "" });
                              }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir "{cat.name}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BrandCategoryManager;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Loader2, Trash2, ChevronDown, ChevronRight, Tag, CheckSquare, Square, Download } from "lucide-react";
import { exportStoreCatalog, downloadCatalogJson } from "@/lib/exportCatalog";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  partner_id: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  brand_id: string | null;
}

const BrandCategoryManager = ({ mode = "brands" }: { mode?: "brands" | "categories" }) => {
  const { store } = useStoreData();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", brand_id: "" });
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);

  // Bulk selection
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (store) loadData();
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [brandsRes, catsRes] = await Promise.all([
        supabase.from("brands").select("id, name, description, active, partner_id").eq("store_id", store.id).order("name"),
        supabase.from("categories").select("id, name, description, brand_id, active").eq("store_id", store.id).order("name"),
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

  const toggleSelectBrand = (id: string) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllBrands = () => {
    if (selectedBrands.length === brands.length) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(brands.map((b) => b.id));
    }
  };

  // Bulk brand actions
  const bulkBrandAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedBrands.length === 0) return;
    try {
      if (action === "delete") {
        await Promise.all(selectedBrands.map(id => supabase.from("brands").delete().eq("id", id)));
        toast.success(`${selectedBrands.length} marca(s) excluída(s)`);
      } else {
        const active = action === "activate";
        await supabase.from("brands").update({ active }).in("id", selectedBrands);
        toast.success(`${selectedBrands.length} marca(s) ${active ? "ativada(s)" : "desativada(s)"}`);
      }
      setSelectedBrands([]);
      loadData();
    } catch {
      toast.error("Erro na operação em lote");
    }
  };

  // Bulk category actions
  const bulkCategoryAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedCategories.length === 0) return;
    try {
      if (action === "delete") {
        await Promise.all(selectedCategories.map(id => supabase.from("categories").delete().eq("id", id)));
        toast.success(`${selectedCategories.length} categoria(s) excluída(s)`);
      } else {
        const active = action === "activate";
        await supabase.from("categories").update({ active }).in("id", selectedCategories);
        toast.success(`${selectedCategories.length} categoria(s) ${active ? "ativada(s)" : "desativada(s)"}`);
      }
      setSelectedCategories([]);
      loadData();
    } catch {
      toast.error("Erro na operação em lote");
    }
  };

  // Single CRUD
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
      toast.error("Erro ao salvar marca");
    }
  };

  const handleDeleteBrand = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Marca excluída");
      loadData();
    } catch {
      toast.error("Erro ao excluir marca. Verifique se não há categorias vinculadas.");
    }
  };

  const toggleBrandActive = async (id: string, active: boolean) => {
    try {
      await supabase.from("brands").update({ active: !active }).eq("id", id);
      toast.success("Status atualizado");
      loadData();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

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
    } catch {
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await supabase.from("categories").delete().eq("id", id);
      toast.success("Categoria excluída");
      loadData();
    } catch {
      toast.error("Erro ao excluir. Verifique se não há modelos vinculados.");
    }
  };

  const toggleCategoryActive = async (id: string, active: boolean) => {
    try {
      await supabase.from("categories").update({ active: !active }).eq("id", id);
      toast.success("Status atualizado");
      loadData();
    } catch {
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

  
  const handleExportCatalog = async () => {
    if (!store) return;
    try {
      toast.loading("Gerando produtos...", { id: "export-catalog" });
      const catalog = await exportStoreCatalog(store.id, store.name);
      downloadCatalogJson(catalog, store.name);
      const total = catalog.brands.reduce((s, b) => s + b.categories.reduce((sc, c) => sc + c.models.length, 0), 0);
      toast.success(`Produtos exportados: ${catalog.brands.length} marcas, ${total} modelos`, { id: "export-catalog" });
    } catch (e: any) {
      toast.error("Erro ao exportar: " + (e?.message || "desconhecido"), { id: "export-catalog" });
    }
  };

  return (
    <div className="space-y-8">
      {/* MARCA FORM - only in brands mode */}
      {mode === "brands" && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-2xl font-bold">
              {editingBrand ? "Editar Marca" : "Nova Marca"}
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={handleExportCatalog} className="gap-2">
              <Download className="w-4 h-4" /> Exportar Meus Produtos
            </Button>
          </div>
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
      )}

      {/* CATEGORIA FORM - only in categories mode */}
      {mode === "categories" && brands.length > 0 && (
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
                      <SelectItem key={b.id} value={b.id}>{b.name}{b.partner_id ? " ®" : ""}</SelectItem>
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

      {/* LISTAGEM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold">
            {mode === "brands" ? "Marcas Cadastradas" : "Categorias por Marca"}
          </h2>
          {mode === "brands" && brands.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllBrands}>
                {selectedBrands.length === brands.length ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                {selectedBrands.length === brands.length ? "Desmarcar" : "Selecionar"} todas
              </Button>
            </div>
          )}
        </div>

        {/* Bulk brand actions bar */}
        {mode === "brands" && selectedBrands.length > 0 && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium">{selectedBrands.length} marca(s) selecionada(s)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => bulkBrandAction("activate")}>
                  Ativar
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkBrandAction("deactivate")}>
                  Desativar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {selectedBrands.length} marca(s)?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Categorias vinculadas também serão excluídas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => bulkBrandAction("delete")}
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

        {/* Bulk category actions bar */}
        {mode === "categories" && selectedCategories.length > 0 && (
          <Card className="p-3 bg-accent/5 border-accent/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium">{selectedCategories.length} categoria(s) selecionada(s)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => bulkCategoryAction("activate")}>
                  Ativar
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkCategoryAction("deactivate")}>
                  Desativar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {selectedCategories.length} categoria(s)?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => bulkCategoryAction("delete")}
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

        {brands.length === 0 ? (
          <Card className="p-8 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {mode === "brands" ? "Nenhuma marca cadastrada ainda." : "Cadastre marcas primeiro para criar categorias."}
            </p>
          </Card>
        ) : (
          brands.map((brand) => {
            const brandCategories = getCategoriesForBrand(brand.id);
            const isExpanded = expandedBrands.includes(brand.id);
            const isSelected = selectedBrands.includes(brand.id);

            if (mode === "brands") {
              return (
                <Card key={brand.id} className={`overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary/30 border-primary bg-primary/5" : "border-border"}`}>
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleSelectBrand(brand.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="shrink-0 pointer-events-none"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">
                        {brand.name}
                        {brand.partner_id && <span className="text-primary ml-1 text-sm font-normal">®</span>}
                      </h3>
                      {brand.description && <p className="text-sm text-muted-foreground">{brand.description}</p>}
                    </div>
                    <Badge variant="secondary">
                      {brandCategories.length} categoria{brandCategories.length !== 1 ? "s" : ""}
                    </Badge>
                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch checked={brand.active} onCheckedChange={() => toggleBrandActive(brand.id, brand.active)} />
                        <span className="text-sm hidden sm:inline">{brand.active ? "Ativo" : "Inativo"}</span>
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
                              Excluir "{brand.name}"? Categorias vinculadas também serão excluídas.
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
                </Card>
              );
            }

            // Categories mode - collapsible by brand
            return (
              <Collapsible key={brand.id} open={isExpanded} onOpenChange={() => toggleExpanded(brand.id)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5" />}
                    <h3 className="text-lg font-bold">
                      {brand.name}
                      {brand.partner_id && <span className="text-primary ml-1 text-sm font-normal">®</span>}
                    </h3>
                    <Badge variant="secondary" className="ml-2">
                      {brandCategories.length} categoria{brandCategories.length !== 1 ? "s" : ""}
                    </Badge>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border/50 p-4 bg-muted/20 space-y-2">
                      {brandCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">
                          Nenhuma categoria nesta marca.
                        </p>
                      ) : (
                        brandCategories.map((cat) => (
                          <div
                            key={cat.id}
                            className={`flex items-center gap-3 p-3 rounded-xl bg-background border-2 cursor-pointer transition-all ${selectedCategories.includes(cat.id) ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/40"}`}
                            onClick={() => toggleSelectCategory(cat.id)}
                          >
                            <Checkbox
                              checked={selectedCategories.includes(cat.id)}
                              className="pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{cat.name}</p>
                              {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Switch checked={cat.active} onCheckedChange={() => toggleCategoryActive(cat.id, cat.active)} />
                              <span className="text-xs hidden sm:inline">{cat.active ? "Ativo" : "Inativo"}</span>
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
                                    <AlertDialogDescription>Excluir "{cat.name}"?</AlertDialogDescription>
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

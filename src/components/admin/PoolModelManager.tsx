import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Loader2, X, Trash2, CheckSquare, Square, Copy, Save, FileDown, GripVertical, MoreVertical, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useStoreData } from "@/hooks/useStoreData";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Brand { id: string; name: string; partner_id?: string | null; }
interface Category { id: string; name: string; brand_id: string | null; }
interface ModelOptional {
  id: string;
  model_id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  margin_percent: number;
  active: boolean;
  item_type: string;
  created_at?: string;
}
interface IncludedItem {
  id: string;
  model_id: string;
  name: string;
  quantity: number;
  cost: number;
  margin_percent: number;
  price: number;
  display_order: number;
  active: boolean;
  item_type: string;
}
interface ItemTemplate {
  id: string;
  name: string;
  items: { name: string; quantity: number; cost: number; margin_percent: number; price: number; display_order: number; item_type: string }[];
  not_included_items: string[];
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
  partner_locked?: boolean;
}

const PoolModelManager = () => {
  const { store } = useStoreData();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [modelOptionals, setModelOptionals] = useState<ModelOptional[]>([]);
  const [includedItems, setIncludedItems] = useState<IncludedItem[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formTab, setFormTab] = useState("dados");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_id: "", name: "", length: "", width: "", depth: "",
    photo_url: "", cost: "", margin_percent: "", base_price: "",
    delivery_days: "30", installation_days: "5", payment_terms: "À vista",
    notes: "",
    differentials: [] as string[], not_included_items: [] as string[],
    newDifferential: "", newNotIncluded: "",
  });

  // Model optional form
  const [optForm, setOptForm] = useState({ name: "", description: "", cost: "", margin_percent: "", price: "", item_type: "material" });
  const [editingOpt, setEditingOpt] = useState<string | null>(null);

  // Included item form (for adding new items)
  const [inclForm, setInclForm] = useState({ name: "", quantity: "1", cost: "", margin_percent: "", price: "", item_type: "material" });
  const [editingIncl, setEditingIncl] = useState<string | null>(null);
  // Inline editing state (for editing existing items in-place)
  const [inlineEditIncl, setInlineEditIncl] = useState<string | null>(null);
  const [inlineInclForm, setInlineInclForm] = useState({ name: "", quantity: "1", cost: "", margin_percent: "", price: "", item_type: "material" });

  // Drag-and-drop reorder state
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Templates (multiple)
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => { if (store) loadData(); }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [brandsRes, categoriesRes, modelsRes, optRes, inclRes, tmplRes] = await Promise.all([
        supabase.from("brands").select("id, name, partner_id").eq("active", true).eq("store_id", store.id),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).eq("store_id", store.id),
        supabase.from("pool_models").select("id, name, category_id, base_price, cost, margin_percent, length, width, depth, photo_url, differentials, included_items, not_included_items, delivery_days, installation_days, payment_terms, notes, display_order, active, partner_locked, created_at").eq("store_id", store.id).order("created_at", { ascending: false }),
        supabase.from("model_optionals").select("id, name, description, price, cost, margin_percent, item_type, model_id, display_order, active, created_at").eq("store_id", store.id).order("display_order", { ascending: true }).order("created_at", { ascending: false }),
        supabase.from("model_included_items").select("id, name, cost, price, margin_percent, quantity, item_type, model_id, display_order, active").eq("store_id", store.id).order("display_order"),
        supabase.from("included_item_templates").select("id, name, not_included_items").eq("store_id", store.id).order("name"),
      ]);
      if (brandsRes.error) throw brandsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (modelsRes.error) throw modelsRes.error;
      setBrands(brandsRes.data || []);
      setCategories(categoriesRes.data || []);
      setModels(modelsRes.data || []);
      setModelOptionals(optRes.data || []);
      setIncludedItems(inclRes.data || []);

      // Load all templates
      const tmplList = tmplRes.data || [];
      const loadedTemplates: ItemTemplate[] = [];
      for (const t of tmplList) {
        const { data: tmplItems } = await supabase
          .from("included_item_template_items")
          .select("id, name, cost, price, margin_percent, quantity, item_type, display_order")
          .eq("store_id", store.id)
          .eq("template_id", t.id)
          .order("display_order");
        loadedTemplates.push({
          id: t.id,
          name: t.name,
          not_included_items: t.not_included_items || [],
          items: (tmplItems || []).map((i: any) => ({
            name: i.name, quantity: Number(i.quantity) || 1, cost: Number(i.cost), margin_percent: Number(i.margin_percent),
            price: Number(i.price), display_order: i.display_order, item_type: i.item_type || "material",
          })),
        });
      }
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally { setLoading(false); }
  };

  const getBrandName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat?.brand_id) return "";
    const brand = brands.find((b) => b.id === cat.brand_id);
    if (!brand) return "";
    return brand.name + (brand.partner_id ? " ®" : "");
  };

  // ---- Array helpers ----
  const addToArray = (field: "differentials" | "not_included_items", inputField: string) => {
    const value = formData[inputField as keyof typeof formData] as string;
    if (!value.trim()) return;
    setFormData({ ...formData, [field]: [...formData[field], value.trim()], [inputField]: "" });
  };
  const removeFromArray = (field: "differentials" | "not_included_items", index: number) => {
    setFormData({ ...formData, [field]: formData[field].filter((_, i) => i !== index) });
  };

  // ---- Included items total for current model ----
  const currentIncludedItems = editing
    ? includedItems.filter((i) => i.model_id === editing).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];
  const includedItemsTotal = useMemo(() => currentIncludedItems.reduce((sum, i) => sum + Number(i.price), 0), [currentIncludedItems]);

  // ---- Model CRUD ----
  const ensureModelSaved = async (): Promise<string | null> => {
    // If already editing an existing model, just return its id
    if (editing) return editing;
    if (saving) return null; // prevent double-creation
    if (!formData.name.trim() || !formData.category_id) {
      toast.error("Preencha o nome e selecione a categoria"); return null;
    }
    if (!store) { toast.error("Loja não encontrada"); return null; }
    setSaving(true);
    try {
      const data = {
        category_id: formData.category_id, name: formData.name,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        depth: formData.depth ? parseFloat(formData.depth) : null,
        photo_url: formData.photo_url || null,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        margin_percent: formData.margin_percent ? parseFloat(formData.margin_percent) : 0,
        base_price: parseFloat(formData.base_price) || 0,
        delivery_days: parseInt(formData.delivery_days) || 30,
        installation_days: parseInt(formData.installation_days) || 5,
        payment_terms: formData.payment_terms,
        notes: formData.notes || null,
        differentials: formData.differentials,
        included_items: [],
        not_included_items: formData.not_included_items,
        store_id: store.id,
      };
      const { data: newModel, error } = await supabase.from("pool_models").insert(data).select("id").single();
      if (error) throw error;
      setEditing(newModel.id);
      toast.success("Modelo salvo automaticamente");
      loadData();
      return newModel.id;
    } catch (e) { console.error(e); toast.error("Erro ao salvar modelo"); return null; }
    finally { setSaving(false); }
  };

  const handleSubmit = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    if (!formData.name.trim() || !formData.category_id || !formData.base_price) {
      toast.error("Preencha os campos obrigatórios"); return false;
    }
    if (!store) { toast.error("Loja não encontrada"); return false; }
    // Ensure model exists first (create if needed, reuse if already created)
    const modelId = await ensureModelSaved();
    if (!modelId) return false;
    try {
      const inclNames = currentIncludedItems.map(i => {
        const qty = Number(i.quantity) || 1;
        return qty > 1 ? `${qty}x ${i.name}` : i.name;
      });
      const data = {
        category_id: formData.category_id, name: formData.name,
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
        included_items: inclNames,
        not_included_items: formData.not_included_items,
      };
      const { error } = await supabase.from("pool_models").update(data).eq("id", modelId);
      if (error) throw error;
      await syncIncludedItemsToModel(modelId);
      loadData();
      return true;
    } catch (error) { console.error(error); toast.error("Erro ao salvar modelo"); return false; }
  };

  const handleNextFromDados = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ok = await handleSubmit();
    if (ok) {
      toast.success("Dados salvos. Avançando para Itens Inclusos.");
      setFormTab("itens");
    }
  };

  const handleNextFromItens = async () => {
    const ok = await handleSubmit();
    if (ok) {
      toast.success("Itens salvos. Avançando para Opcionais Dimensionados.");
      setFormTab("opcionais");
    }
  };

  const handleFinalSave = async () => {
    const ok = await handleSubmit();
    if (ok) toast.success("Modelo salvo com sucesso!");
  };

  const resetForm = () => {
    setFormData({
      category_id: "", name: "", length: "", width: "", depth: "",
      photo_url: "", cost: "", margin_percent: "", base_price: "",
      delivery_days: "30", installation_days: "5", payment_terms: "À vista", notes: "",
      differentials: [], not_included_items: [],
      newDifferential: "", newNotIncluded: "",
    });
    setEditing(null);
    setFormTab("dados");
    setInclForm({ name: "", quantity: "1", cost: "", margin_percent: "", price: "", item_type: "material" });
    setEditingIncl(null);
  };

  const handleEdit = (model: PoolModel) => {
    setEditing(model.id);
    setFormData({
      category_id: model.category_id, name: model.name,
      length: model.length?.toString() || "", width: model.width?.toString() || "",
      depth: model.depth?.toString() || "", photo_url: model.photo_url || "",
      cost: model.cost?.toString() || "", margin_percent: model.margin_percent?.toString() || "",
      base_price: model.base_price.toString(),
      delivery_days: model.delivery_days.toString(), installation_days: model.installation_days.toString(),
      payment_terms: model.payment_terms || "À vista", notes: model.notes || "",
      differentials: model.differentials || [],
      not_included_items: model.not_included_items || [],
      newDifferential: "", newNotIncluded: "",
    });
    setFormTab("dados");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("pool_models").delete().eq("id", id);
      if (error) throw error;
      toast.success("Modelo excluído"); loadData();
    } catch { toast.error("Erro ao excluir modelo"); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("pool_models").update({ active: !active }).eq("id", id);
      if (error) throw error;
      toast.success("Status atualizado"); loadData();
    } catch { toast.error("Erro ao atualizar status"); }
  };

  // ---- Model Optionals CRUD ----
  const handleOptSubmit = async () => {
    if (!editing) { toast.error("Salve o modelo primeiro para adicionar opcionais dimensionados"); return; }
    if (!optForm.name.trim() || !optForm.price) { toast.error("Preencha nome e preço"); return; }
    try {
      const data = {
        model_id: editing,
        store_id: store!.id,
        name: optForm.name,
        description: optForm.description || null,
        cost: optForm.cost ? parseFloat(optForm.cost) : 0,
        margin_percent: optForm.margin_percent ? parseFloat(optForm.margin_percent) : 0,
        price: parseFloat(optForm.price),
        item_type: optForm.item_type,
      };
      if (editingOpt) {
        const { error } = await supabase.from("model_optionals").update(data).eq("id", editingOpt);
        if (error) throw error;
        toast.success("Opcional atualizado");
      } else {
        const { error } = await supabase.from("model_optionals").insert(data);
        if (error) throw error;
        toast.success("Opcional adicionado");
      }
      setOptForm({ name: "", description: "", cost: "", margin_percent: "", price: "", item_type: "material" });
      setEditingOpt(null);
      loadData();
    } catch { toast.error("Erro ao salvar opcional"); }
  };

  const handleDeleteOpt = async (id: string) => {
    try {
      await supabase.from("model_optionals").delete().eq("id", id);
      toast.success("Opcional excluído"); loadData();
    } catch { toast.error("Erro ao excluir"); }
  };

  const handleEditOpt = (opt: ModelOptional) => {
    setEditingOpt(opt.id);
    setOptForm({
      name: opt.name, description: opt.description || "",
      cost: opt.cost?.toString() || "", margin_percent: opt.margin_percent?.toString() || "",
      price: opt.price.toString(), item_type: opt.item_type || "material",
    });
  };

  // ---- Included Items CRUD ----
  const calcInclPrice = (qty: string, cost: string, margin: string) => {
    const q = parseFloat(qty) || 1;
    const c = parseFloat(cost) || 0;
    const m = parseFloat(margin) || 0;
    return (q * c * (1 + m / 100)).toFixed(2);
  };

  const handleInclSubmit = async () => {
    const modelId = editing || await ensureModelSaved();
    if (!modelId) { toast.error("Salve o modelo primeiro para adicionar itens inclusos"); return; }
    if (!inclForm.name.trim()) { toast.error("Preencha o nome do item"); return; }
    try {
      const qty = parseInt(inclForm.quantity) || 1;
      const unitCost = inclForm.cost ? parseFloat(inclForm.cost) : 0;
      const margin = inclForm.margin_percent ? parseFloat(inclForm.margin_percent) : 0;
      const totalPrice = inclForm.price ? parseFloat(inclForm.price) : 0;

      if (editingIncl) {
        // Preserve existing display_order on edit
        const existingItem = includedItems.find(i => i.id === editingIncl);
        const data = {
          name: inclForm.name,
          quantity: qty,
          cost: unitCost,
          margin_percent: margin,
          price: totalPrice,
          display_order: existingItem?.display_order ?? 0,
          item_type: inclForm.item_type,
        };
        const { data: updated, error } = await supabase
          .from("model_included_items")
          .update(data)
          .eq("id", editingIncl)
          .select();
        if (error) throw error;
        if (!updated || updated.length === 0) {
          toast.error("Sem permissão para editar este item. Apenas o proprietário da loja pode editar itens inclusos.");
          return;
        }
        // Update local state in-place without full reload
        setIncludedItems(prev => prev.map(item =>
          item.id === editingIncl
            ? { ...item, ...data }
            : item
        ));
        toast.success("Item atualizado");
      } else {
        const data = {
          model_id: modelId,
          store_id: store!.id,
          name: inclForm.name,
          quantity: qty,
          cost: unitCost,
          margin_percent: margin,
          price: totalPrice,
          display_order: currentIncludedItems.length,
          item_type: inclForm.item_type,
        };
        const { data: inserted, error } = await supabase.from("model_included_items").insert(data).select().single();
        if (error) throw error;
        setIncludedItems(prev => [...prev, inserted as IncludedItem]);
        toast.success("Item adicionado");
      }
      setInclForm({ name: "", quantity: "1", cost: "", margin_percent: "", price: "", item_type: "material" });
      setEditingIncl(null);
      await syncIncludedItemsToModel(modelId);
    } catch (err: any) { console.error("Erro ao salvar item incluso:", err); toast.error(`Erro ao salvar item incluso: ${err?.message || ""}`); }
  };

  const handleDeleteIncl = async (id: string) => {
    try {
      await supabase.from("model_included_items").delete().eq("id", id);
      setIncludedItems(prev => prev.filter(item => item.id !== id));
      toast.success("Item excluído");
      await syncIncludedItemsToModel(editing!);
    } catch { toast.error("Erro ao excluir item"); }
  };

  const handleEditIncl = (item: IncludedItem) => {
    setInlineEditIncl(item.id);
    setInlineInclForm({
      name: item.name,
      quantity: item.quantity?.toString() || "1",
      cost: item.cost?.toString() || "",
      margin_percent: item.margin_percent?.toString() || "",
      price: item.price?.toString() || "",
      item_type: item.item_type || "material",
    });
  };

  const handleInlineInclSave = async () => {
    if (!inlineEditIncl) return;
    if (!inlineInclForm.name.trim()) { toast.error("Preencha o nome do item"); return; }
    try {
      const qty = parseInt(inlineInclForm.quantity) || 1;
      const unitCost = inlineInclForm.cost ? parseFloat(inlineInclForm.cost) : 0;
      const margin = inlineInclForm.margin_percent ? parseFloat(inlineInclForm.margin_percent) : 0;
      const totalPrice = inlineInclForm.price ? parseFloat(inlineInclForm.price) : 0;
      const existingItem = includedItems.find(i => i.id === inlineEditIncl);
      const data = {
        name: inlineInclForm.name,
        quantity: qty,
        cost: unitCost,
        margin_percent: margin,
        price: totalPrice,
        display_order: existingItem?.display_order ?? 0,
        item_type: inlineInclForm.item_type,
      };
      const { data: updated, error } = await supabase
        .from("model_included_items")
        .update(data)
        .eq("id", inlineEditIncl)
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) {
        toast.error("Sem permissão para editar este item. Apenas o proprietário da loja pode editar itens inclusos.");
        return;
      }
      setIncludedItems(prev => prev.map(item =>
        item.id === inlineEditIncl ? { ...item, ...data } : item
      ));
      toast.success("Item atualizado");
      setInlineEditIncl(null);
      if (existingItem) await syncIncludedItemsToModel(existingItem.model_id);
    } catch (err: any) {
      console.error("Erro ao salvar item incluso:", err);
      toast.error(`Erro ao salvar: ${err?.message || "tente novamente"}`);
    }
  };
  const syncIncludedItemsToModel = async (modelId: string) => {
    try {
      const { data: items, error } = await supabase
        .from("model_included_items")
        .select("name, quantity, item_type")
        .eq("model_id", modelId)
        .eq("active", true)
        .order("display_order");
      if (error) throw error;
      const inclNames = (items || []).map(i => {
        const qty = Number(i.quantity) || 1;
        const prefix = i.item_type === "mao_de_obra" ? "[MO] " : "";
        return qty > 1 ? `${qty}x ${prefix}${i.name}` : `${prefix}${i.name}`;
      });
      const { error: updateError } = await supabase.from("pool_models").update({ included_items: inclNames }).eq("id", modelId);
      if (updateError) throw updateError;
    } catch (e) { console.error("Erro ao sincronizar itens inclusos:", e); }
  };

  // Legacy manual sync button handler
  const handleSaveIncludedToModel = async () => {
    if (!editing) return;
    await syncIncludedItemsToModel(editing);
    toast.success("Itens inclusos sincronizados com o modelo");
    loadData();
  };

  // ---- Drag-and-drop reorder ----
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (itemId !== dragOverItemId) setDragOverItemId(itemId);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragItemId || dragItemId === targetId || !editing) {
      setDragItemId(null);
      setDragOverItemId(null);
      return;
    }

    const items = [...currentIncludedItems];
    const dragIndex = items.findIndex(i => i.id === dragItemId);
    const targetIndex = items.findIndex(i => i.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const [moved] = items.splice(dragIndex, 1);
    items.splice(targetIndex, 0, moved);

    // Update display_order locally
    const updatedItems = items.map((item, idx) => ({ ...item, display_order: idx }));
    setIncludedItems(prev => {
      const otherItems = prev.filter(i => i.model_id !== editing);
      return [...otherItems, ...updatedItems];
    });

    setDragItemId(null);
    setDragOverItemId(null);

    // Persist all display_order updates
    try {
      await Promise.all(
        updatedItems.map((item, idx) =>
          supabase.from("model_included_items").update({ display_order: idx }).eq("id", item.id)
        )
      );
      await syncIncludedItemsToModel(editing);
    } catch {
      toast.error("Erro ao salvar ordem");
      loadData();
    }
  };

  // ---- Drag-and-drop reorder for OPCIONAIS DIMENSIONADOS ----
  const handleOptDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragItemId || dragItemId === targetId || !editing) {
      setDragItemId(null);
      setDragOverItemId(null);
      return;
    }

    const items = [...currentModelOptionals];
    const dragIndex = items.findIndex((i) => i.id === dragItemId);
    const targetIndex = items.findIndex((i) => i.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) {
      setDragItemId(null);
      setDragOverItemId(null);
      return;
    }

    const [moved] = items.splice(dragIndex, 1);
    items.splice(targetIndex, 0, moved);

    const updatedItems = items.map((item, idx) => ({ ...item, display_order: idx }));
    setModelOptionals((prev) => {
      const others = prev.filter((i) => i.model_id !== editing);
      return [...others, ...updatedItems];
    });

    setDragItemId(null);
    setDragOverItemId(null);

    try {
      await Promise.all(
        updatedItems.map((item, idx) =>
          supabase.from("model_optionals").update({ display_order: idx }).eq("id", item.id)
        )
      );
    } catch {
      toast.error("Erro ao salvar ordem");
      loadData();
    }
  };

  const handleDragEnd = () => {
    setDragItemId(null);
    setDragOverItemId(null);
  };
   const handleSaveAsTemplate = async (name: string) => {
    if (!store || currentIncludedItems.length === 0) {
      toast.error("Tenha pelo menos 1 item para salvar como template"); return;
    }
    try {
      const { data: tmpl, error: tmplErr } = await supabase.from("included_item_templates")
        .insert({ store_id: store.id, name, not_included_items: formData.not_included_items || [] }).select("id").single();
      if (tmplErr) throw tmplErr;
      const items = currentIncludedItems.map((i, idx) => ({
        template_id: tmpl.id, store_id: store.id, name: i.name,
        quantity: Number(i.quantity) || 1,
        cost: Number(i.cost), margin_percent: Number(i.margin_percent),
        price: Number(i.price), display_order: idx,
        item_type: i.item_type || "material",
      }));
      const { error: itemsErr } = await supabase.from("included_item_template_items").insert(items);
      if (itemsErr) throw itemsErr;
      toast.success(`Template "${name}" salvo com ${items.length} itens`);
      loadData();
    } catch { toast.error("Erro ao salvar template"); }
  };

  const handleDeleteTemplate = async (tmpl: ItemTemplate) => {
    if (!store) return;
    try {
      await supabase.from("included_item_template_items").delete().eq("template_id", tmpl.id);
      await supabase.from("included_item_templates").delete().eq("id", tmpl.id);
      toast.success(`Template "${tmpl.name}" excluído`);
      loadData();
    } catch { toast.error("Erro ao excluir template"); }
  };

  const handleApplyTemplate = async (tmpl: ItemTemplate) => {
    if (!store) return;
    const modelId = editing || await ensureModelSaved();
    if (!modelId) return;
    try {
      await supabase.from("model_included_items").delete().eq("model_id", modelId).eq("store_id", store.id);
      const items = tmpl.items.map((i, idx) => ({
        model_id: modelId, store_id: store.id, name: i.name,
        quantity: Number(i.quantity) || 1,
        cost: Number(i.cost) || 0, margin_percent: Number(i.margin_percent) || 0,
        price: Number(i.price) || 0, display_order: idx,
        item_type: i.item_type || "material",
      }));
      if (items.length > 0) {
        const { error } = await supabase.from("model_included_items").insert(items);
        if (error) throw error;
      }
      setFormData(prev => ({ ...prev, not_included_items: tmpl.not_included_items || [] }));
      await supabase.from("pool_models").update({ not_included_items: tmpl.not_included_items || [] }).eq("id", modelId);
      toast.success(`Template "${tmpl.name}" aplicado com ${items.length} itens`);
      await syncIncludedItemsToModel(modelId);
      loadData();
    } catch { toast.error("Erro ao aplicar template"); }
  };

  // ---- Bulk actions ----
  const toggleSelectModel = (id: string) => setSelectedModels((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAllModels = () => setSelectedModels(selectedModels.length === models.length ? [] : models.map((m) => m.id));
  const bulkModelAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedModels.length === 0) return;
    try {
      if (action === "delete") {
        await Promise.all(selectedModels.map(id => supabase.from("pool_models").delete().eq("id", id)));
        toast.success(`${selectedModels.length} modelo(s) excluído(s)`);
      } else {
        const active = action === "activate";
        await supabase.from("pool_models").update({ active }).in("id", selectedModels);
        toast.success(`${selectedModels.length} modelo(s) ${active ? "ativado(s)" : "desativado(s)"}`);
      }
      setSelectedModels([]); loadData();
    } catch { toast.error("Erro na operação em lote"); }
  };

  const currentModelOptionals = editing ? modelOptionals.filter((o) => o.model_id === editing) : [];

  // Compute total price: model base_price + included items total
  const computedTotalPrice = useMemo(() => {
    const basePrice = formData.base_price ? parseFloat(formData.base_price) : 0;
    return basePrice + includedItemsTotal;
  }, [formData.base_price, includedItemsTotal]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const renderArrayField = (label: string, field: "differentials" | "not_included_items", inputField: string, placeholder: string) => (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mb-2">
        <Input
          value={formData[inputField as keyof typeof formData] as string}
          onChange={(e) => setFormData(prev => ({ ...prev, [inputField]: e.target.value }))}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToArray(field, inputField); } }}
        />
        <Button type="button" onClick={() => addToArray(field, inputField)}><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {formData[field].map((item, idx) => (
          <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray(field, idx)}>
            {item} <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
      </div>
    </div>
  );

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* ===== FORM ===== */}
      <Card className="p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">{editing ? "Editar Modelo" : "Novo Modelo"}</h2>


        <Tabs value={formTab} onValueChange={(tab) => {
          setFormTab(tab);
        }}>
          <TabsList className="mb-3">
            <TabsTrigger value="dados" className="text-xs sm:text-sm">Dados</TabsTrigger>
            <TabsTrigger value="itens" disabled={!formData.category_id} className="text-xs sm:text-sm">Itens Inclusos</TabsTrigger>
            <TabsTrigger value="opcionais" disabled={!formData.category_id} className="text-xs sm:text-sm">Opcionais Dimensionados</TabsTrigger>
          </TabsList>

          {/* TAB: Dados */}
          <TabsContent value="dados">
            <form onSubmit={handleNextFromDados} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoria (Marca) *</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => {
                        const brandName = getBrandName(cat.id);
                        return <SelectItem key={cat.id} value={cat.id}>{cat.name}{brandName ? ` — ${brandName}` : ""}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome do Modelo *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Modelo Premium 8x4" />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Comprimento (m)</Label>
                  <Input type="number" step="0.01" value={formData.length} onChange={(e) => setFormData({ ...formData, length: e.target.value })} placeholder="Ex: 8.00" />
                </div>
                <div>
                  <Label>Largura (m)</Label>
                  <Input type="number" step="0.01" value={formData.width} onChange={(e) => setFormData({ ...formData, width: e.target.value })} placeholder="Ex: 4.00" />
                </div>
                <div>
                  <Label>Profundidade (m)</Label>
                  <Input type="number" step="0.01" value={formData.depth} onChange={(e) => setFormData({ ...formData, depth: e.target.value })} placeholder="Ex: 1.40" />
                </div>
              </div>

              <div>
                <Label>URL da Foto</Label>
                <Input type="text" value={formData.photo_url} onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} placeholder="https://exemplo.com/foto.jpg" />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Custo da Piscina (R$)</Label>
                  <Input type="number" step="0.01" value={formData.cost}
                    onChange={(e) => {
                      const cost = e.target.value;
                      const margin = formData.margin_percent;
                      const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : formData.base_price;
                      setFormData({ ...formData, cost, base_price: price });
                    }} placeholder="0.00" />
                </div>
                <div>
                  <Label>Margem (%)</Label>
                  <Input type="number" step="0.1" value={formData.margin_percent}
                    onChange={(e) => {
                      const margin = e.target.value;
                      const cost = formData.cost;
                      const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : formData.base_price;
                      setFormData({ ...formData, margin_percent: margin, base_price: price });
                    }} placeholder="Ex: 30" />
                </div>
                <div>
                  <Label>Preço Piscina (R$) *</Label>
                  <Input type="number" step="0.01" value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} placeholder="0.00" />
                  {formData.cost && parseFloat(formData.cost) > 0 && formData.base_price && parseFloat(formData.base_price) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Lucro piscina: R$ {fmt(parseFloat(formData.base_price) - parseFloat(formData.cost))}
                      {" "}({(((parseFloat(formData.base_price) - parseFloat(formData.cost)) / parseFloat(formData.cost)) * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>
              </div>

              {editing && includedItemsTotal > 0 && (
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Preço Piscina: R$ {fmt(formData.base_price ? parseFloat(formData.base_price) : 0)}</span>
                    <span className="text-muted-foreground">+ Itens Inclusos: R$ {fmt(includedItemsTotal)}</span>
                    <span className="font-bold text-primary text-base">= Total: R$ {fmt(computedTotalPrice)}</span>
                  </div>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Prazo Entrega (dias)</Label>
                  <Input type="number" value={formData.delivery_days} onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })} />
                </div>
                <div>
                  <Label>Prazo Instalação (dias)</Label>
                  <Input type="number" value={formData.installation_days} onChange={(e) => setFormData({ ...formData, installation_days: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Input value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} placeholder="Ex: À vista" />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Informações adicionais..." rows={3} />
              </div>

              

              <div className="flex gap-2">
                <Button type="submit" className="gradient-primary text-white">Próximo</Button>
                {editing && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
              </div>
            </form>
          </TabsContent>

          {/* TAB: Itens Inclusos (spreadsheet-like) */}
          <TabsContent value="itens">
            {!editing ? (
              <p className="text-muted-foreground text-center py-8">Salve o modelo primeiro para gerenciar itens inclusos.</p>
            ) : (
              <div className="space-y-4">
                {/* Template actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-muted-foreground flex-1">
                    Cadastre cada item incluso com custo, margem e preço. Na proposta, apenas o nome será exibido.
                  </p>
                  {templates.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <FileDown className="w-4 h-4 mr-1" /> Templates ({templates.length})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {templates.map((t) => (
                          <div key={t.id} className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded-sm">
                            <DropdownMenuItem className="flex-1 cursor-pointer" onClick={() => handleApplyTemplate(t)}>
                              <FileDown className="w-3 h-3 mr-1.5" />
                              {t.name} ({t.items.length} itens)
                            </DropdownMenuItem>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteTemplate(t)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Add/edit form */}
                <Card className="p-4 bg-muted/30">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label>Qtd *</Label>
                      <Input type="number" min="1" value={inclForm.quantity}
                        onChange={(e) => {
                          const quantity = e.target.value;
                          const price = calcInclPrice(quantity, inclForm.cost, inclForm.margin_percent);
                          setInclForm({ ...inclForm, quantity, price });
                        }} placeholder="1" />
                    </div>
                    <div className="col-span-1">
                      <Label>Nome do Item *</Label>
                      <Input value={inclForm.name} onChange={(e) => setInclForm({ ...inclForm, name: e.target.value })} placeholder="Ex: Instalação" />
                    </div>
                    <div>
                      <Label>Custo Unit. (R$)</Label>
                      <Input type="number" step="0.01" value={inclForm.cost}
                        onChange={(e) => {
                          const cost = e.target.value;
                          const price = calcInclPrice(inclForm.quantity, cost, inclForm.margin_percent);
                          setInclForm({ ...inclForm, cost, price });
                        }} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Margem (%)</Label>
                      <Input type="number" step="0.1" value={inclForm.margin_percent}
                        onChange={(e) => {
                          const margin = e.target.value;
                          const price = calcInclPrice(inclForm.quantity, inclForm.cost, margin);
                          setInclForm({ ...inclForm, margin_percent: margin, price });
                        }} placeholder="Ex: 30" />
                    </div>
                    <div>
                      <Label>Preço Total (R$)</Label>
                      <Input type="number" step="0.01" value={inclForm.price}
                        onChange={(e) => setInclForm({ ...inclForm, price: e.target.value })} placeholder="0.00" />
                      {inclForm.cost && parseFloat(inclForm.cost) > 0 && inclForm.quantity && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {inclForm.quantity}x R$ {fmt(parseFloat(inclForm.cost))} = R$ {fmt((parseFloat(inclForm.quantity) || 1) * parseFloat(inclForm.cost))} (custo)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3 items-end">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={inclForm.item_type} onValueChange={(v) => setInclForm({ ...inclForm, item_type: v })}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Equipamentos</SelectItem>
                          <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" onClick={handleInclSubmit} className="gradient-primary text-white">
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                </Card>

                {/* Table */}
                {currentIncludedItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum item incluso cadastrado para este modelo.</p>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead className="w-[60px] text-center">Qtd</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-[140px] whitespace-nowrap text-center">Tipo</TableHead>
                            <TableHead className="text-right">Custo Unit.</TableHead>
                            <TableHead className="text-right">Custo Total</TableHead>
                            <TableHead className="text-right">Markup</TableHead>
                            <TableHead className="text-right">Preço Venda</TableHead>
                            <TableHead className="text-right">Lucro Bruto</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentIncludedItems.map((item) => {
                            const isInlineEditing = inlineEditIncl === item.id;
                            const qty = Number(item.quantity) || 1;
                            const unitCost = Number(item.cost);
                            const totalCost = qty * unitCost;
                            const lucro = Number(item.price) - totalCost;

                            if (isInlineEditing) {
                              const inlineQty = parseInt(inlineInclForm.quantity) || 1;
                              const inlineUnitCost = parseFloat(inlineInclForm.cost) || 0;
                              const inlineTotalCost = inlineQty * inlineUnitCost;
                              const inlinePrice = parseFloat(inlineInclForm.price) || 0;
                              const inlineLucro = inlinePrice - inlineTotalCost;
                              return (
                                <TableRow key={item.id} className="bg-primary/5" onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleInlineInclSave(); }
                                  else if (e.key === "Escape") { e.preventDefault(); setInlineEditIncl(null); }
                                }}>
                                  <TableCell className="p-1"></TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" min="1" className="w-16 h-8 text-center" value={inlineInclForm.quantity}
                                      onChange={(e) => {
                                        const quantity = e.target.value;
                                        const price = calcInclPrice(quantity, inlineInclForm.cost, inlineInclForm.margin_percent);
                                        setInlineInclForm({ ...inlineInclForm, quantity, price });
                                      }} />
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Input className="h-8" value={inlineInclForm.name}
                                      onChange={(e) => setInlineInclForm({ ...inlineInclForm, name: e.target.value })} />
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Select value={inlineInclForm.item_type} onValueChange={(v) => setInlineInclForm({ ...inlineInclForm, item_type: v })}>
                                      <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                         <SelectItem value="material">Equipamentos</SelectItem>
                                         <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" step="0.01" className="w-24 h-8 text-right" value={inlineInclForm.cost}
                                      onChange={(e) => {
                                        const cost = e.target.value;
                                        const price = calcInclPrice(inlineInclForm.quantity, cost, inlineInclForm.margin_percent);
                                        setInlineInclForm({ ...inlineInclForm, cost, price });
                                      }} />
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground text-sm">R$ {fmt(inlineTotalCost)}</TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" step="0.1" className="w-20 h-8 text-right" value={inlineInclForm.margin_percent}
                                      onChange={(e) => {
                                        const margin = e.target.value;
                                        const price = calcInclPrice(inlineInclForm.quantity, inlineInclForm.cost, margin);
                                        setInlineInclForm({ ...inlineInclForm, margin_percent: margin, price });
                                      }} />
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" step="0.01" className="w-28 h-8 text-right" value={inlineInclForm.price}
                                      onChange={(e) => setInlineInclForm({ ...inlineInclForm, price: e.target.value })} />
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{inlineLucro >= 0 ? <span className="text-emerald-600">R$ {fmt(inlineLucro)}</span> : <span className="text-destructive">R$ {fmt(inlineLucro)}</span>}</TableCell>
                                  <TableCell className="text-right p-1">
                                    <div className="flex gap-1 justify-end">
                                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={handleInlineInclSave}><Save className="w-3.5 h-3.5" /></Button>
                                      <Button variant="ghost" size="sm" onClick={() => setInlineEditIncl(null)}><X className="w-3.5 h-3.5" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return (
                              <TableRow
                                key={item.id}
                                onDragOver={(e) => handleDragOver(e, item.id)}
                                onDrop={(e) => handleDrop(e, item.id)}
                                className={`transition-colors ${dragItemId === item.id ? "opacity-40" : ""} ${dragOverItemId === item.id && dragItemId !== item.id ? "border-t-2 border-primary" : ""}`}
                              >
                                <TableCell
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item.id)}
                                  onDragEnd={handleDragEnd}
                                  className="cursor-grab active:cursor-grabbing px-2 select-none"
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </TableCell>
                                <TableCell className="text-center font-medium">{qty}</TableCell>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={`whitespace-nowrap inline-flex ${item.item_type === "mao_de_obra" ? "text-amber-600 border-amber-300 bg-amber-50" : "text-sky-600 border-sky-300 bg-sky-50"}`}>
                                    {item.item_type === "mao_de_obra" ? "M. Obra" : "Equipamentos"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">R$ {fmt(unitCost)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">R$ {fmt(totalCost)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{item.margin_percent}%</TableCell>
                                <TableCell className="text-right font-medium">R$ {fmt(Number(item.price))}</TableCell>
                                <TableCell className="text-right text-emerald-600">R$ {fmt(lucro)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditIncl(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteIncl(item.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Totals row */}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>TOTAL ITENS INCLUSOS</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">R$ {fmt(currentIncludedItems.reduce((s, i) => s + (Number(i.quantity) || 1) * Number(i.cost), 0))}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right text-primary">R$ {fmt(includedItemsTotal)}</TableCell>
                            <TableCell className="text-right text-emerald-600">
                              R$ {fmt(currentIncludedItems.reduce((s, i) => s + (Number(i.price) - (Number(i.quantity) || 1) * Number(i.cost)), 0))}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Grand total summary */}
                    <Card className="p-4 bg-primary/5 border-primary/20">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preço Piscina</span>
                          <span>R$ {fmt(formData.base_price ? parseFloat(formData.base_price) : 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Itens Inclusos</span>
                          <span>R$ {fmt(includedItemsTotal)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1 text-base font-bold">
                          <span>Preço Total de Venda</span>
                          <span className="text-primary">R$ {fmt(computedTotalPrice)}</span>
                        </div>
                      </div>
                    </Card>

                    {/* Not included items */}
                    <div className="pt-4 border-t">
                      {renderArrayField("Itens Não Inclusos", "not_included_items", "newNotIncluded", "Ex: Aquecedor solar")}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={handleNextFromItens} className="gradient-primary text-white">
                        Próximo
                      </Button>
                      {currentIncludedItems.length > 0 && (
                        <Button type="button" variant="outline" onClick={() => { setTemplateName(""); setShowSaveTemplateDialog(true); }}>
                          <Save className="w-4 h-4 mr-1" /> Salvar como Template
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* TAB: Opcionais Dimensionados */}
          <TabsContent value="opcionais">
            {!editing ? (
              <p className="text-muted-foreground text-center py-8">Salve o modelo primeiro para gerenciar opcionais dimensionados.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Opcionais dimensionados deste modelo. Esses itens aparecem apenas para este modelo na proposta.
                </p>

                {/* Add/edit form */}
                <Card className="p-4 bg-muted/30">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Nome *</Label>
                      <Input value={optForm.name} onChange={(e) => setOptForm({ ...optForm, name: e.target.value })} placeholder="Ex: Revestimento especial" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input value={optForm.description} onChange={(e) => setOptForm({ ...optForm, description: e.target.value })} placeholder="Detalhes do opcional" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <Label>Custo (R$)</Label>
                      <Input type="number" step="0.01" value={optForm.cost}
                        onChange={(e) => {
                          const cost = e.target.value;
                          const margin = optForm.margin_percent;
                          const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : optForm.price;
                          setOptForm({ ...optForm, cost, price });
                        }} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Margem (%)</Label>
                      <Input type="number" step="0.1" value={optForm.margin_percent}
                        onChange={(e) => {
                          const margin = e.target.value;
                          const cost = optForm.cost;
                          const price = cost && margin ? (parseFloat(cost) * (1 + parseFloat(margin) / 100)).toFixed(2) : optForm.price;
                          setOptForm({ ...optForm, margin_percent: margin, price });
                        }} placeholder="Ex: 30" />
                    </div>
                    <div>
                      <Label>Preço (R$) *</Label>
                      <Input type="number" step="0.01" value={optForm.price}
                        onChange={(e) => setOptForm({ ...optForm, price: e.target.value })} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={optForm.item_type} onValueChange={(v) => setOptForm({ ...optForm, item_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Equipamentos</SelectItem>
                          <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={handleOptSubmit} className="gradient-primary text-white">
                      <Plus className="w-4 h-4 mr-1" /> {editingOpt ? "Atualizar" : "Adicionar"}
                    </Button>
                    {editingOpt && (
                      <Button variant="outline" onClick={() => { setEditingOpt(null); setOptForm({ name: "", description: "", cost: "", margin_percent: "", price: "", item_type: "material" }); }}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </Card>

                {/* List */}
                {currentModelOptionals.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum opcional dimensionado cadastrado para este modelo.</p>
                ) : (
                  <div className="space-y-2">
                    {currentModelOptionals.map((opt) => (
                      <div
                        key={opt.id}
                        onDragOver={(e) => handleDragOver(e, opt.id)}
                        onDrop={(e) => handleOptDrop(e, opt.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border bg-background transition-colors ${
                          dragItemId === opt.id ? "opacity-40" : ""
                        } ${
                          dragOverItemId === opt.id && dragItemId !== opt.id
                            ? "border-primary border-2"
                            : "border-border/50"
                        }`}
                      >
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, opt.id)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing px-1 mr-2 select-none flex-shrink-0"
                          title="Arraste para reordenar"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{opt.name}</p>
                          {opt.description && <p className="text-xs text-muted-foreground">{opt.description}</p>}
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className={opt.item_type === "mao_de_obra" ? "text-amber-600 border-amber-300 bg-amber-50" : "text-sky-600 border-sky-300 bg-sky-50"}>
                              {opt.item_type === "mao_de_obra" ? "M. Obra" : "Equipamentos"}
                            </Badge>
                            {opt.cost > 0 && <span>Custo: R$ {fmt(opt.cost)}</span>}
                            {opt.margin_percent > 0 && <span>Margem: {opt.margin_percent}%</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-primary">R$ {fmt(opt.price)}</span>
                          <Button variant="outline" size="sm" onClick={() => handleEditOpt(opt)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteOpt(opt.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Final save */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button type="button" onClick={handleFinalSave} className="gradient-primary text-white">
                    <Save className="w-4 h-4 mr-1" /> Salvar Alterações
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Concluir</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* ===== FILTERS + LISTING ===== */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterBrand} onValueChange={(v) => { setFilterBrand(v); setFilterCategory("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Marcas</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}{b.partner_id ? " ®" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {(filterBrand === "all" ? categories : categories.filter((c) => c.brand_id === filterBrand)).map((c) =>
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            )}
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
            <div className="flex gap-2 flex-wrap">
              <Select onValueChange={async (catId) => {
                if (selectedModels.length === 0) return;
                try {
                  for (const id of selectedModels) {
                    await supabase.from("pool_models").update({ category_id: catId }).eq("id", id);
                  }
                  toast.success(`${selectedModels.length} modelo(s) movido(s) para a nova categoria`);
                  setSelectedModels([]); loadData();
                } catch { toast.error("Erro ao mover modelos"); }
              }}>
                <SelectTrigger className="w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Trocar Categoria / Marca" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => {
                    const brand = brands.find(b => b.id === cat.brand_id);
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}{brand ? ` — ${brand.name}${brand.partner_id ? " ®" : ""}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => bulkModelAction("activate")}>Ativar</Button>
              <Button size="sm" variant="outline" onClick={() => bulkModelAction("deactivate")}>Desativar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive"><Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedModels.length} modelo(s)?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkModelAction("delete")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      )}

      {(() => {
        let filtered = models;
        if (filterStatus === "active") filtered = filtered.filter((m) => m.active);
        else if (filterStatus === "inactive") filtered = filtered.filter((m) => !m.active);
        if (filterCategory !== "all") {
          filtered = filtered.filter((m) => m.category_id === filterCategory);
        } else if (filterBrand !== "all") {
          const brandCatIds = categories.filter((c) => c.brand_id === filterBrand).map((c) => c.id);
          filtered = filtered.filter((m) => brandCatIds.includes(m.category_id));
        }
        // Ordenar do maior para o menor (área = length × width)
        filtered = [...filtered].sort((a, b) => {
          const areaA = (Number(a.length) || 0) * (Number(a.width) || 0);
          const areaB = (Number(b.length) || 0) * (Number(b.width) || 0);
          if (areaB !== areaA) return areaB - areaA;
          return (Number(b.length) || 0) - (Number(a.length) || 0);
        });
        if (filtered.length === 0) return <p className="text-muted-foreground text-center py-8">Nenhum modelo encontrado.</p>;

        return (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((model) => {
              const brandName = getBrandName(model.category_id);
              const catName = categories.find((c) => c.id === model.category_id)?.name || "Sem categoria";
              const mOpts = modelOptionals.filter((o) => o.model_id === model.id);
              const mIncl = includedItems.filter((i) => i.model_id === model.id);
              const inclTotal = mIncl.reduce((s, i) => s + Number(i.price), 0);
              const displayPrice = model.base_price + inclTotal;
              const isSelected = selectedModels.includes(model.id);

              return (
                <Card
                  key={model.id}
                  className={`group overflow-hidden transition-all flex flex-col ${
                    isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/40"
                  } ${!model.active ? "opacity-60" : ""}`}
                >
                  {/* Photo */}
                  <div
                    className="relative aspect-[4/3] bg-muted cursor-pointer overflow-hidden"
                    onClick={() => toggleSelectModel(model.id)}
                  >
                    {model.photo_url ? (
                      <img
                        src={model.photo_url}
                        alt={model.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                        Sem foto
                      </div>
                    )}
                    <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectModel(model.id)}
                        className="bg-background/80 backdrop-blur-sm border-2"
                      />
                    </div>
                    {!model.active && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="text-[10px] h-5">Inativo</Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="font-semibold text-sm truncate" title={model.name}>{model.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {brandName ? `${brandName} • ` : ""}{catName}
                    </p>
                    {(model.length || model.width || model.depth) && (
                      <p className="text-[11px] text-muted-foreground mt-auto">
                        {model.length || "?"}m × {model.width || "?"}m{model.depth ? ` × ${model.depth}m` : ""}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
                      <Switch
                        checked={model.active}
                        onCheckedChange={() => toggleActive(model.id, model.active)}
                        aria-label="Ativar/Desativar"
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(model)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Excluir"
                            >
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
                              <AlertDialogAction
                                onClick={() => handleDelete(model.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}
      {/* Dialog para nomear template */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Template</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nome do Template</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: Fibra Padrão"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancelar</Button>
            <Button
              disabled={!templateName.trim()}
              onClick={() => {
                handleSaveAsTemplate(templateName.trim());
                setShowSaveTemplateDialog(false);
              }}
            >
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoolModelManager;

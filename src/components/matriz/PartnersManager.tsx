import { useState, useEffect, useRef, useCallback, SyntheticEvent } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Upload, Trash2, Image as ImageIcon, Trophy, Pencil, Check, Save, FolderPlus, Tag, Package } from "lucide-react";
import PartnerCatalogManager from "./PartnerCatalogManager";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/validateImageFile";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  banner_1_url: string | null;
  banner_2_url: string | null;
  active: boolean;
  display_order: number;
  ranking: number;
  display_percent: number;
}

interface PartnerCategory {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  display_order: number;
}

const RANKING_LABELS: Record<number, string> = {
  1: "🥇 1º Lugar",
  2: "🥈 2º Lugar",
  3: "🥉 3º Lugar",
};

const PartnersManager = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [originalPartners, setOriginalPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoDims, setLogoDims] = useState<Record<string, string>>({});

  const handleLogoLoad = (partnerId: string, e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setLogoDims(prev => ({ ...prev, [partnerId]: `${img.naturalWidth}×${img.naturalHeight}` }));
  };
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories state
  const [categories, setCategories] = useState<Record<string, PartnerCategory[]>>({});
  const [newCatName, setNewCatName] = useState<Record<string, string>>({});
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  const [catalogPartner, setCatalogPartner] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const [partnersRes, catsRes] = await Promise.all([
      supabase.from("partners").select("id, name, logo_url, banner_1_url, banner_2_url, display_percent, ranking, active, display_order").order("ranking", { ascending: true }),
      supabase.from("partner_categories").select("id, name, description, partner_id, display_order").order("display_order", { ascending: true }),
    ]);

    if (partnersRes.error) {
      toast.error("Erro ao carregar parceiros");
      console.error(partnersRes.error);
    } else {
      const sorted = (partnersRes.data as Partner[]) || [];
      setPartners(sorted);
      setOriginalPartners(JSON.parse(JSON.stringify(sorted)));
    }

    if (!catsRes.error && catsRes.data) {
      const grouped: Record<string, PartnerCategory[]> = {};
      for (const cat of catsRes.data as PartnerCategory[]) {
        if (!grouped[cat.partner_id]) grouped[cat.partner_id] = [];
        grouped[cat.partner_id].push(cat);
      }
      setCategories(grouped);
    }

    setLoading(false);
  };

  const isDirty = useCallback(() => {
    if (partners.length !== originalPartners.length) return true;
    return partners.some((p) => {
      const orig = originalPartners.find((o) => o.id === p.id);
      if (!orig) return true;
      return (
        p.ranking !== orig.ranking ||
        p.display_percent !== orig.display_percent ||
        p.name !== orig.name ||
        p.banner_1_url !== orig.banner_1_url
      );
    });
  }, [partners, originalPartners]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) return;
    setNewLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setNewLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (file: File, partnerId: string): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${partnerId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("partner-logos").upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("partner-logos").getPublicUrl(filePath);
    return publicUrl;
  };

  const handleAddPartner = async () => {
    if (!newName.trim()) { toast.error("Digite o nome do parceiro"); return; }
    if (!newLogoFile) { toast.error("Selecione a logo do parceiro"); return; }
    setUploading(true);
    try {
      const nextRanking = partners.length > 0 ? Math.max(...partners.map((p) => p.ranking)) + 1 : 1;
      const { data: partnerData, error: insertError } = await supabase
        .from("partners")
        .insert({ name: newName.trim(), display_order: nextRanking, ranking: nextRanking })
        .select()
        .single();
      if (insertError) throw insertError;
      const logoUrl = await uploadLogo(newLogoFile, partnerData.id);
      const { error: updateError } = await supabase.from("partners").update({ logo_url: logoUrl }).eq("id", partnerData.id);
      if (updateError) throw updateError;
      // Auto-create matching catalog brand for this partner
      await supabase.from("partner_catalog_brands").insert({
        partner_id: partnerData.id,
        name: newName.trim(),
        display_order: 0,
      });
      toast.success("Parceiro cadastrado com sucesso!");
      setNewName(""); setNewLogoFile(null); setNewLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchPartners();
    } catch (error: any) {
      toast.error("Erro ao cadastrar parceiro: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    const { error } = await supabase.from("partners").update({ active: !partner.active }).eq("id", partner.id);
    if (error) { toast.error("Erro ao atualizar status"); }
    else {
      setPartners((prev) => prev.map((p) => (p.id === partner.id ? { ...p, active: !p.active } : p)));
      setOriginalPartners((prev) => prev.map((p) => (p.id === partner.id ? { ...p, active: !p.active } : p)));
    }
  };

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`Remover parceiro "${partner.name}"? Categorias vinculadas também serão removidas.`)) return;
    const { error } = await supabase.from("partners").delete().eq("id", partner.id);
    if (error) { toast.error("Erro ao remover parceiro"); }
    else {
      toast.success("Parceiro removido");
      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
      setOriginalPartners((prev) => prev.filter((p) => p.id !== partner.id));
      setCategories((prev) => {
        const next = { ...prev };
        delete next[partner.id];
        return next;
      });
    }
  };

  const handleReplaceLogo = async (partner: Partner, file: File) => {
    setSaving(true);
    try {
      const logoUrl = await uploadLogo(file, partner.id);
      const { error } = await supabase.from("partners").update({ logo_url: logoUrl }).eq("id", partner.id);
      if (error) throw error;
      toast.success("Logo atualizada!");
      fetchPartners();
    } catch (error: any) {
      toast.error("Erro ao atualizar logo: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updates = partners.filter((p) => {
        const orig = originalPartners.find((o) => o.id === p.id);
        if (!orig) return false;
        return (
          p.ranking !== orig.ranking ||
          p.display_percent !== orig.display_percent ||
          p.name !== orig.name ||
          p.banner_1_url !== orig.banner_1_url
        );
      });

      for (const p of updates) {
        const { error } = await supabase.from("partners").update({
          ranking: p.ranking,
          display_percent: p.display_percent,
          name: p.name,
          banner_1_url: p.banner_1_url,
        }).eq("id", p.id);
        if (error) throw error;
      }

      setAnimating(true);
      requestAnimationFrame(() => {
        const sorted = [...partners].sort((a, b) => a.ranking - b.ranking);
        setPartners(sorted);
        setOriginalPartners(JSON.parse(JSON.stringify(sorted)));
        requestAnimationFrame(() => setAnimating(false));
      });

      toast.success(`${updates.length} parceiro(s) atualizado(s)!`);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePartnerField = (id: string, field: keyof Partner, value: any) => {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // --- Category management ---
  const handleAddCategory = async (partnerId: string) => {
    const name = (newCatName[partnerId] || "").trim();
    if (!name) { toast.error("Digite o nome da categoria"); return; }

    const currentCats = categories[partnerId] || [];
    const nextOrder = currentCats.length > 0 ? Math.max(...currentCats.map(c => c.display_order)) + 1 : 0;

    const { data, error } = await supabase
      .from("partner_categories")
      .insert({ partner_id: partnerId, name, display_order: nextOrder })
      .select()
      .single();

    if (error) { toast.error("Erro ao adicionar categoria"); console.error(error); return; }

    setCategories((prev) => ({
      ...prev,
      [partnerId]: [...(prev[partnerId] || []), data as PartnerCategory],
    }));
    setNewCatName((prev) => ({ ...prev, [partnerId]: "" }));
    toast.success(`Categoria "${name}" adicionada!`);
  };

  const handleDeleteCategory = async (partnerId: string, catId: string, catName: string) => {
    if (!confirm(`Remover a categoria "${catName}"?`)) return;
    const { error } = await supabase.from("partner_categories").delete().eq("id", catId);
    if (error) { toast.error("Erro ao remover categoria"); return; }
    setCategories((prev) => ({
      ...prev,
      [partnerId]: (prev[partnerId] || []).filter((c) => c.id !== catId),
    }));
    toast.success("Categoria removida");
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  const hasDirtyChanges = isDirty();

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">Parceiros</h1>
          <p className="text-[13px] text-muted-foreground">
            Gerencie os parceiros, categorias e rankings de exibição nas propostas
          </p>
        </div>
        {hasDirtyChanges && (
          <Button onClick={handleSaveAll} disabled={saving} className="gradient-primary text-white gap-2 animate-fade-in" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
        )}
      </div>

      {/* Add new partner */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Cadastrar Novo Parceiro</h2>
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="space-y-4">
            <div>
              <Label>Nome do Parceiro / Marca</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: iGUi Piscinas" disabled={uploading} />
            </div>
            <div>
              <Label>Logo do Parceiro</Label>
              <div className="flex items-center gap-4 mt-1">
                {newLogoPreview ? (
                  <div className="w-20 h-20 rounded-xl border-2 border-primary/20 bg-background flex items-center justify-center overflow-hidden p-2">
                    <img src={newLogoPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    {newLogoPreview ? "Trocar" : "Selecionar Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG. Máx 5MB.</p>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleAddPartner} disabled={uploading || !newName.trim() || !newLogoFile} className="gradient-primary text-white h-10">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Cadastrar
          </Button>
        </div>
      </Card>

      {/* Ranking explanation */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Trophy className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-foreground">Sistema de Ranking, Frequência e Categorias</p>
            <p className="text-muted-foreground mt-1">
              Cada parceiro funciona como uma <strong>Marca</strong>. Ao cadastrar categorias aqui, quando um lojista selecionar esse parceiro,
              a marca e suas categorias serão <strong>criadas automaticamente</strong> no catálogo da loja.
            </p>
            <p className="text-muted-foreground mt-1">
              O lojista então cadastra livremente seus <strong>modelos, opcionais e preços</strong> dentro dessas categorias.
            </p>
            {(() => {
              const totalPercent = partners.filter(p => p.active).reduce((sum, p) => sum + p.display_percent, 0);
              const isValid = totalPercent === 100;
              return (
                <div className={`mt-3 p-2 rounded-lg text-sm font-semibold ${isValid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                  Total de aparição (ativos): {totalPercent}% {isValid ? "✓" : "— deve somar 100%"}
                </div>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* Partners list */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Parceiros Cadastrados ({partners.length})</h2>
          {hasDirtyChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-fade-in">● Alterações não salvas</span>
          )}
        </div>

        {partners.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum parceiro cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {partners.map((partner) => {
              const isEditing = editingId === partner.id;
              const isExpanded = expandedPartner === partner.id;
              const partnerCats = categories[partner.id] || [];

              return (
                <div key={partner.id} className="space-y-0">
                  {/* ── Desktop layout ── */}
                  <div
                    className={`hidden sm:flex items-start gap-4 p-4 rounded-xl border ${
                      animating ? "transition-all duration-500 ease-in-out" : "transition-colors duration-200"
                    } ${
                      isEditing ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" :
                      partner.active ? "bg-background border-border/50" : "bg-muted/30 border-border/20 opacity-60"
                    }`}
                  >
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        partner.ranking === 1 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        partner.ranking === 2 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                        partner.ranking === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        #{partner.ranking}
                      </div>
                    </div>
                    <div className="flex flex-col items-center shrink-0 gap-0.5">
                      <div className="w-14 h-14 rounded-xl bg-background border border-border/50 flex items-center justify-center overflow-hidden p-1.5">
                        {partner.logo_url ? (
                          <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain" onLoad={(e) => handleLogoLoad(partner.id, e)} />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                        )}
                      </div>
                      {logoDims[partner.id] && (
                        <span className="text-[9px] text-muted-foreground font-mono">{logoDims[partner.id]}px</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <>
                          <div className="mb-2">
                            <Label className="text-xs">Nome</Label>
                            <Input value={partner.name} onChange={(e) => updatePartnerField(partner.id, "name", e.target.value)} className="h-8 text-sm mt-0.5" />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div>
                              <Label className="text-xs">Ranking</Label>
                              <Input type="number" min={1} max={99} value={partner.ranking}
                                onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) updatePartnerField(partner.id, "ranking", val); }}
                                className="w-20 h-8 text-xs text-center mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-xs">Frequência (%)</Label>
                              <Input type="number" min={0} max={100} value={partner.display_percent}
                                onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val)) updatePartnerField(partner.id, "display_percent", val); }}
                                className="w-24 h-8 text-xs text-center mt-0.5" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Banner da Proposta (URL)</Label>
                            <Input className="h-8 text-xs mt-0.5" placeholder="URL do banner lateral"
                              value={partner.banner_1_url || ""}
                              onChange={(e) => updatePartnerField(partner.id, "banner_1_url", e.target.value.trim() || null)} />
                            <p className="text-[10px] text-muted-foreground mt-0.5">📐 Proporção 2:3 vertical — 400×600px</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold truncate">{partner.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {RANKING_LABELS[partner.ranking] || `${partner.ranking}º Lugar`} · {partner.active ? "Ativo" : "Oculto"} · {partner.display_percent}%
                          </p>
                          {partner.banner_1_url && <p className="text-[10px] text-muted-foreground mt-1 truncate">🖼 Banner configurado</p>}
                          <button onClick={() => setExpandedPartner(isExpanded ? null : partner.id)} className="mt-1 text-xs text-primary hover:underline flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {partnerCats.length} categoria{partnerCats.length !== 1 ? "s" : ""} <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)} className="text-xs gap-1"><Check className="w-3.5 h-3.5" /> OK</Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(partner.id)} className="h-8 w-8"><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                      )}
                      <div>
                        <input type="file" accept="image/*" className="hidden" id={`replace-logo-${partner.id}`}
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleReplaceLogo(partner, file); }} />
                        <Button variant="ghost" size="sm" onClick={() => document.getElementById(`replace-logo-${partner.id}`)?.click()} disabled={saving}><Upload className="w-4 h-4" /></Button>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setCatalogPartner({ id: partner.id, name: partner.name })} className="h-8 w-8" title="Catálogo Padrão"><Package className="w-4 h-4 text-primary" /></Button>
                      <Switch checked={partner.active} onCheckedChange={() => handleToggleActive(partner)} />
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(partner)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {/* ── Mobile layout ── */}
                  <div className={`sm:hidden rounded-xl border overflow-hidden ${
                    isEditing ? "bg-primary/5 border-primary/30" :
                    partner.active ? "border-border" : "border-border/20 opacity-60"
                  }`}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 p-3 pb-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[12px] shrink-0 ${
                        partner.ranking === 1 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        partner.ranking === 2 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                        partner.ranking === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        #{partner.ranking}
                      </div>
                      <div className="flex flex-col items-center shrink-0 gap-0.5">
                        <div className="w-11 h-11 rounded-lg bg-background border border-border/50 flex items-center justify-center overflow-hidden p-1">
                          {partner.logo_url ? (
                            <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain" onLoad={(e) => handleLogoLoad(partner.id, e)} />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                          )}
                        </div>
                        {logoDims[partner.id] && (
                          <span className="text-[8px] text-muted-foreground font-mono">{logoDims[partner.id]}px</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] font-semibold text-foreground truncate">{partner.name}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {partner.active ? "Ativo" : "Oculto"} · {partner.display_percent}%
                        </p>
                      </div>
                    </div>

                    {/* Info rows */}
                    {isEditing ? (
                      <div className="px-3 pt-2.5 pb-2 space-y-2">
                        <div>
                          <Label className="text-[10px]">Nome</Label>
                          <Input value={partner.name} onChange={(e) => updatePartnerField(partner.id, "name", e.target.value)} className="h-8 text-sm mt-0.5" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Ranking</Label>
                            <Input type="number" min={1} max={99} value={partner.ranking}
                              onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) updatePartnerField(partner.id, "ranking", val); }}
                              className="h-8 text-xs text-center mt-0.5" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Frequência (%)</Label>
                            <Input type="number" min={0} max={100} value={partner.display_percent}
                              onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val)) updatePartnerField(partner.id, "display_percent", val); }}
                              className="h-8 text-xs text-center mt-0.5" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Banner (URL)</Label>
                          <Input className="h-8 text-xs mt-0.5" placeholder="URL do banner"
                            value={partner.banner_1_url || ""}
                            onChange={(e) => updatePartnerField(partner.id, "banner_1_url", e.target.value.trim() || null)} />
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 pt-2 pb-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Ranking</span>
                          <span className="text-[12px] font-medium text-foreground">{RANKING_LABELS[partner.ranking] || `${partner.ranking}º Lugar`}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Frequência</span>
                          <span className="text-[12px] font-semibold text-foreground">{partner.display_percent}%</span>
                        </div>
                        {partner.banner_1_url && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">Banner</span>
                            <span className="text-[11px] text-foreground">🖼 Configurado</span>
                          </div>
                        )}
                        <button onClick={() => setExpandedPartner(isExpanded ? null : partner.id)} className="mt-0.5 text-[11px] text-primary hover:underline flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {partnerCats.length} categoria{partnerCats.length !== 1 ? "s" : ""} <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                      </div>
                    )}

                    {/* Actions footer */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
                      <div className="flex items-center gap-1.5">
                        <Switch checked={partner.active} onCheckedChange={() => handleToggleActive(partner)} className="scale-90" />
                        <span className="text-[10px] text-muted-foreground">{partner.active ? "Ativo" : "Oculto"}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {isEditing ? (
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)} className="h-7 text-[11px] gap-1"><Check className="w-3 h-3" /> OK</Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(partner.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                        )}
                        <input type="file" accept="image/*" className="hidden" id={`replace-logo-mob-${partner.id}`}
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleReplaceLogo(partner, file); }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.getElementById(`replace-logo-mob-${partner.id}`)?.click()} disabled={saving}><Upload className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCatalogPartner({ id: partner.id, name: partner.name })} title="Catálogo"><Package className="w-3.5 h-3.5 text-primary" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(partner)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </div>

                  {/* Categories section */}
                  {isExpanded && (
                    <div className="ml-14 mt-1 mb-2 p-4 rounded-lg border border-border/50 bg-muted/30 space-y-3 animate-fade-in">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-primary" />
                        Categorias de {partner.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Essas categorias serão criadas automaticamente quando um lojista selecionar este parceiro.
                      </p>

                      {partnerCats.length > 0 && (
                        <div className="space-y-1.5">
                          {partnerCats.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50">
                              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1 truncate">{cat.name}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCategory(partner.id, cat.id, cat.name)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Input
                          value={newCatName[partner.id] || ""}
                          onChange={(e) => setNewCatName((prev) => ({ ...prev, [partner.id]: e.target.value }))}
                          placeholder="Nome da categoria"
                          className="h-8 text-sm flex-1"
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(partner.id); }}
                        />
                        <Button size="sm" variant="outline" onClick={() => handleAddCategory(partner.id)}
                          disabled={!(newCatName[partner.id] || "").trim()} className="h-8 gap-1">
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasDirtyChanges && partners.length > 0 && (
          <div className="mt-6 flex justify-end animate-fade-in">
            <Button onClick={handleSaveAll} disabled={saving} className="gradient-primary text-white gap-2" size="lg">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        )}
      </Card>
      {catalogPartner && (
        <PartnerCatalogManager
          partnerId={catalogPartner.id}
          partnerName={catalogPartner.name}
          open={!!catalogPartner}
          onOpenChange={(o) => !o && setCatalogPartner(null)}
        />
      )}
    </div>
  );
};

export default PartnersManager;

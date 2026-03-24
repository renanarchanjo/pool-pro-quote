import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Upload, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  banner_1_url: string | null;
  banner_2_url: string | null;
  active: boolean;
  display_order: number;
}

const PartnersManager = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar parceiros");
      console.error(error);
    } else {
      setPartners(data || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setNewLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setNewLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (file: File, partnerId: string): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${partnerId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("partner-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("partner-logos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddPartner = async () => {
    if (!newName.trim()) {
      toast.error("Digite o nome do parceiro");
      return;
    }
    if (!newLogoFile) {
      toast.error("Selecione a logo do parceiro");
      return;
    }

    setUploading(true);
    try {
      const nextOrder = partners.length > 0
        ? Math.max(...partners.map((p) => p.display_order)) + 1
        : 0;

      const { data: partnerData, error: insertError } = await supabase
        .from("partners")
        .insert({ name: newName.trim(), display_order: nextOrder })
        .select()
        .single();

      if (insertError) throw insertError;

      const logoUrl = await uploadLogo(newLogoFile, partnerData.id);

      const { error: updateError } = await supabase
        .from("partners")
        .update({ logo_url: logoUrl })
        .eq("id", partnerData.id);

      if (updateError) throw updateError;

      toast.success("Parceiro cadastrado com sucesso!");
      setNewName("");
      setNewLogoFile(null);
      setNewLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchPartners();
    } catch (error: any) {
      toast.error("Erro ao cadastrar parceiro: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    const { error } = await supabase
      .from("partners")
      .update({ active: !partner.active })
      .eq("id", partner.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, active: !p.active } : p))
      );
    }
  };

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`Remover parceiro "${partner.name}"?`)) return;

    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("id", partner.id);

    if (error) {
      toast.error("Erro ao remover parceiro");
    } else {
      toast.success("Parceiro removido");
      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
    }
  };

  const handleReplaceLogo = async (partner: Partner, file: File) => {
    setSaving(true);
    try {
      const logoUrl = await uploadLogo(file, partner.id);
      const { error } = await supabase
        .from("partners")
        .update({ logo_url: logoUrl })
        .eq("id", partner.id);

      if (error) throw error;
      toast.success("Logo atualizada!");
      fetchPartners();
    } catch (error: any) {
      toast.error("Erro ao atualizar logo: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parceiros</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os parceiros exibidos na página pública /parceiros
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Cadastrar Novo Parceiro</h2>
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="space-y-4">
            <div>
              <Label>Nome do Parceiro</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: iGUi Piscinas"
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Logo do Parceiro</Label>
              <div className="flex items-center gap-4 mt-1">
                {newLogoPreview ? (
                  <div className="w-20 h-20 rounded-xl border-2 border-primary/20 bg-background flex items-center justify-center overflow-hidden p-2">
                    <img
                      src={newLogoPreview}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {newLogoPreview ? "Trocar" : "Selecionar Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG ou SVG. Máx 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddPartner}
            disabled={uploading || !newName.trim() || !newLogoFile}
            className="gradient-primary text-white h-10"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Cadastrar
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Parceiros Cadastrados ({partners.length})
        </h2>

        {partners.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum parceiro cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  partner.active
                    ? "bg-background border-border/50"
                    : "bg-muted/30 border-border/20 opacity-60"
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

                <div className="w-16 h-16 rounded-xl bg-background border border-border/50 flex items-center justify-center overflow-hidden p-2 shrink-0">
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{partner.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {partner.active ? "Visível na página" : "Oculto"}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-20 shrink-0">Banner 1:</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="URL do banner lateral (postimages, etc)"
                        defaultValue={partner.banner_1_url || ""}
                        onBlur={async (e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== partner.banner_1_url) {
                            await supabase.from("partners").update({ banner_1_url: val }).eq("id", partner.id);
                            setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, banner_1_url: val } : p));
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-20 shrink-0">Banner 2:</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="URL do banner rodapé (postimages, etc)"
                        defaultValue={partner.banner_2_url || ""}
                        onBlur={async (e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== partner.banner_2_url) {
                            await supabase.from("partners").update({ banner_2_url: val }).eq("id", partner.id);
                            setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, banner_2_url: val } : p));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id={`replace-logo-${partner.id}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReplaceLogo(partner, file);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      document.getElementById(`replace-logo-${partner.id}`)?.click()
                    }
                    disabled={saving}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>

                <Switch
                  checked={partner.active}
                  onCheckedChange={() => handleToggleActive(partner)}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(partner)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PartnersManager;

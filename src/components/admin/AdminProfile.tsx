import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload, Building2, User, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

const AdminProfile = () => {
  const { profile, store, storeSettings, refetch } = useStoreData();
  const [fullName, setFullName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
    if (storeSettings) setLogoUrl(storeSettings.logo_url || "");
  }, [profile, storeSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${store.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("store-logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !store) return;
    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { error: settingsError } = await supabase
        .from("store_settings")
        .update({ logo_url: logoUrl || null })
        .eq("store_id", store.id);
      if (settingsError) throw settingsError;

      toast.success("Perfil atualizado com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = (store?.name || "L").substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-border">
            <div className="w-full max-w-md rounded-lg border-2 border-dashed border-primary/20 bg-muted/50 overflow-hidden" style={{ aspectRatio: "3 / 2" }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo da loja"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-40" />
                  <span className="text-sm">Nenhuma logo enviada</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {logoUrl ? "Trocar Logo" : "Enviar Logo"}
            </Button>
            <p className="text-xs text-muted-foreground">Formato horizontal recomendado: 1500×1000px (3:2). PNG, JPG ou SVG.</p>
          </div>

          {/* Fields */}
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Nome Completo
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Nome da Empresa / Loja
              </Label>
              <Input value={store?.name || ""} disabled />
              <p className="text-xs text-muted-foreground">
                O nome da loja não pode ser alterado por aqui.
              </p>
            </div>

            {logoUrl && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Logo Atual
                </Label>
                <div className="p-4 bg-muted rounded-lg">
                  <img
                    src={logoUrl}
                    alt="Logo da empresa"
                    className="max-h-24 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={loading} className="gradient-primary text-white w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Perfil
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;

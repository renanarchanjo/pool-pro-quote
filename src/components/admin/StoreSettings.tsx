import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Palette, Upload } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";

const StoreSettings = () => {
  const { store, storeSettings, refetch } = useStoreData();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [secondaryColor, setSecondaryColor] = useState("#06b6d4");

  useEffect(() => {
    if (storeSettings) {
      setLogoUrl(storeSettings.logo_url || "");
      setPrimaryColor(storeSettings.primary_color || "#0ea5e9");
      setSecondaryColor(storeSettings.secondary_color || "#06b6d4");
    }
  }, [storeSettings]);

  const handleSave = async () => {
    if (!store) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq("store_id", store.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Personalização da Marca</h2>
        <p className="text-muted-foreground">
          Configure a identidade visual da sua loja
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="storeName" className="text-lg font-semibold">
              Nome da Loja
            </Label>
            <Input
              id="storeName"
              value={store?.name || ""}
              disabled
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              O nome da loja não pode ser alterado
            </p>
          </div>

          <div>
            <Label htmlFor="storeSlug" className="text-lg font-semibold">
              Link da Loja
            </Label>
            <div className="mt-2 p-3 bg-muted rounded-md font-mono text-sm">
              {window.location.origin}/?store={store?.slug}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Compartilhe este link com seus clientes para acessar o simulador
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Identidade Visual</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="logoUrl">
                  <Upload className="w-4 h-4 inline mr-2" />
                  URL do Logo
                </Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2"
                />
                {logoUrl && (
                  <div className="mt-3 p-4 bg-muted rounded-lg">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-h-20 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        toast.error("URL do logo inválida");
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#0ea5e9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#06b6d4"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">Pré-visualização:</p>
                <div className="flex gap-2">
                  <div
                    className="w-20 h-20 rounded-lg shadow-md"
                    style={{ background: primaryColor }}
                  />
                  <div
                    className="w-20 h-20 rounded-lg shadow-md"
                    style={{ background: secondaryColor }}
                  />
                  <div
                    className="flex-1 h-20 rounded-lg shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="gradient-primary text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StoreSettings;

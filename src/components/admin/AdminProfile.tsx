import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Building2, User, Image as ImageIcon, Mail, Lock, Eye, EyeOff, Copy, ExternalLink, Share2, Link as LinkIcon, Search, MapPin, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import { validateImageFile } from "@/lib/validateImageFile";

const AdminProfile = () => {
  const { profile, store, storeSettings, role, refetch } = useStoreData();
  const [fullName, setFullName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company / contract data
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [fetchingCnpj, setFetchingCnpj] = useState(false);

  const isOwner = role === "owner";

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
    if (storeSettings) setLogoUrl(storeSettings.logo_url || "");
    if (store) {
      setRazaoSocial(store.razao_social || "");
      setCnpj(store.cnpj || "");
      setAddress(store.address || "");
      setCity(store.city || "");
      setState(store.state || "");
      setCep(store.cep || "");
      setWhatsapp(store.whatsapp || "");
      setCompanyEmail(store.company_email || "");
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email || "");
    });
  }, [profile, storeSettings, store]);

  const handleFetchCnpj = async () => {
    const clean = (cnpj || "").replace(/\D/g, "");
    if (clean.length !== 14) {
      toast.error("Informe um CNPJ válido (14 dígitos)");
      return;
    }
    setFetchingCnpj(true);
    try {
      const r = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`);
      if (!r.ok) throw new Error("CNPJ não encontrado");
      const j = await r.json();
      const e = j.estabelecimento || {};
      const ruaNumero = [e.tipo_logradouro, e.logradouro, e.numero].filter(Boolean).join(" ");
      const partes = [ruaNumero, e.complemento, e.bairro ? `Bairro ${e.bairro}` : null].filter(Boolean);
      const cepDigits = (e.cep || "").replace(/\D/g, "");
      const cepFmt = cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : "";
      setRazaoSocial(j.razao_social || razaoSocial);
      setAddress(partes.join(", "));
      setCity(e.cidade?.nome || city);
      setState(e.estado?.sigla || state);
      setCep(cepFmt);
      if (e.ddd1 && e.telefone1) setWhatsapp(`(${e.ddd1}) ${e.telefone1}`);
      if (e.email) setCompanyEmail(e.email);
      toast.success("Dados preenchidos pelo CNPJ");
    } catch (err: any) {
      toast.error("Falha ao consultar CNPJ: " + (err?.message || "tente novamente"));
    } finally {
      setFetchingCnpj(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    if (!validateImageFile(file)) return;

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

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha os dois campos de senha");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-8">

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
                  Preview na Proposta
                </Label>
                <div className="p-4 bg-muted rounded-lg">
                  <img
                    src={logoUrl}
                    alt="Logo da empresa"
                    className="h-12 w-auto object-contain"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Assim aparecerá no cabeçalho das propostas</p>
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

      {/* Simulation Link Card - visible for owner */}
      {isOwner && store && (
        <div
          className="max-w-2xl rounded-xl border p-5 md:p-6"
          style={{ background: "#F0F9FF", borderColor: "#E0F2FE" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
            Seu link de simulação
          </p>
          <div
            className="rounded-lg px-4 py-3 mb-4 font-semibold text-base select-all break-all"
            style={{ background: "#F8F9FA", border: "1px solid #E5E7EB", color: "#0F172A" }}
          >
            simulapool.com/s/{store.slug || ""}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                navigator.clipboard.writeText(`https://www.simulapool.com/s/${store.slug || ""}`);
                toast.success("Link copiado!");
              }}
            >
              <Copy className="w-4 h-4" />
              Copiar link
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                const msg = encodeURIComponent(
                  `Simule sua piscina de fibra pelo nosso simulador online! 👇\nhttps://www.simulapool.com/s/${store.slug || ""}`
                );
                window.open(`https://wa.me/?text=${msg}`, "_blank");
              }}
            >
              <Share2 className="w-4 h-4" />
              Compartilhar no WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`/s/${store.slug || ""}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              Ver simulador
            </Button>
          </div>
        </div>
      )}

      {/* Credenciais de Acesso - visível para owner */}
      {isOwner && (
        <Card className="p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Credenciais de Acesso</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                E-mail de Login
              </Label>
              <Input value={userEmail} disabled />
              <p className="text-xs text-muted-foreground">
                O e-mail de acesso não pode ser alterado.
              </p>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Alterar Senha
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="w-full"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Alterar Senha
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminProfile;

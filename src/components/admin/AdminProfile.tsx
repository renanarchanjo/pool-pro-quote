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
      // 1) BrasilAPI (CORS habilitado, gratuito, sem rate-limit agressivo)
      let data: any = null;
      try {
        const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
        if (r.ok) data = await r.json();
      } catch {}

      // 2) Fallback: publica.cnpj.ws
      if (!data) {
        try {
          const r2 = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`);
          if (r2.ok) {
            const j = await r2.json();
            const e = j.estabelecimento || {};
            data = {
              razao_social: j.razao_social,
              logradouro: e.logradouro,
              numero: e.numero,
              complemento: e.complemento,
              bairro: e.bairro,
              municipio: e.cidade?.nome,
              uf: e.estado?.sigla,
              cep: e.cep,
              ddd_telefone_1: e.ddd1 && e.telefone1 ? `${e.ddd1}${e.telefone1}` : "",
              email: e.email,
            };
          }
        } catch {}
      }

      if (!data) throw new Error("CNPJ não encontrado ou serviço indisponível");

      const ruaNumero = [data.logradouro, data.numero].filter(Boolean).join(", ");
      const partes = [ruaNumero, data.complemento, data.bairro ? `Bairro ${data.bairro}` : null].filter(Boolean);
      const cepDigits = (data.cep || "").toString().replace(/\D/g, "");
      const cepFmt = cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : "";
      const telDigits = (data.ddd_telefone_1 || "").toString().replace(/\D/g, "");
      const telFmt = telDigits.length >= 10 ? `(${telDigits.slice(0, 2)}) ${telDigits.slice(2)}` : "";

      setRazaoSocial(data.razao_social || razaoSocial);
      setAddress(partes.join(", "));
      setCity(data.municipio || city);
      setState(data.uf || state);
      if (cepFmt) setCep(cepFmt);
      if (telFmt) setWhatsapp(telFmt);
      if (data.email) setCompanyEmail(data.email);
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
        .upsert(
          { store_id: store.id, logo_url: logoUrl || null },
          { onConflict: "store_id" }
        );
      if (settingsError) throw settingsError;

      // Save company/contract data (only owners pass RLS)
      if (isOwner) {
        const { error: storeError } = await supabase
          .from("stores")
          .update({
            razao_social: razaoSocial || null,
            cnpj: (cnpj || "").replace(/\D/g, "") || null,
            address: address || null,
            city: city || null,
            state: state || null,
            cep: cep || null,
            whatsapp: whatsapp || null,
            company_email: companyEmail || null,
          })
          .eq("id", store.id);
        if (storeError) throw storeError;
      }

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

  // Outros tipos de piscina
  const [offersAlvenaria, setOffersAlvenaria] = useState(false);
  const [offersVinil, setOffersVinil] = useState(false);
  const [savingOffers, setSavingOffers] = useState<null | "alvenaria" | "vinil">(null);

  useEffect(() => {
    setOffersAlvenaria(!!store?.offers_alvenaria);
    setOffersVinil(!!store?.offers_vinil);
  }, [store?.offers_alvenaria, store?.offers_vinil]);

  const toggleOffer = async (field: "alvenaria" | "vinil", value: boolean) => {
    if (!store || !isOwner) return;
    setSavingOffers(field);
    if (field === "alvenaria") setOffersAlvenaria(value);
    else setOffersVinil(value);
    try {
      const { error } = await supabase
        .from("stores")
        .update(field === "alvenaria" ? { offers_alvenaria: value } : { offers_vinil: value })
        .eq("id", store.id);
      if (error) throw error;
      toast.success("Configuração salva");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
      if (field === "alvenaria") setOffersAlvenaria(!value);
      else setOffersVinil(!value);
    } finally {
      setSavingOffers(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <Card className="p-6">
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

            {/* Dados Cadastrais (usados nos contratos) */}
            {isOwner && (
              <div className="border-t border-border pt-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Dados Cadastrais (usados nos contratos)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estes dados serão preenchidos automaticamente em todos os contratos gerados pela sua loja.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <div className="flex gap-2">
                    <Input
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchCnpj}
                      disabled={fetchingCnpj}
                      className="gap-1 shrink-0"
                    >
                      {fetchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Buscar dados
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique em "Buscar dados" para preencher automaticamente Razão Social, endereço, CEP, telefone e e-mail.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Razão social da empresa" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Endereço completo (rua, número, bairro)
                  </Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Telefone / WhatsApp
                    </Label>
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      E-mail comercial
                    </Label>
                    <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contato@empresa.com" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-5">
              <Label className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                Logo da Empresa
              </Label>
              <p className="text-xs text-muted-foreground">
                Aparece no cabeçalho das propostas e nos cards de busca pública.
              </p>

              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <Input
                    type="url"
                    placeholder="https://exemplo.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl("")}
                      className="text-destructive hover:text-destructive h-auto p-0"
                    >
                      Remover logo
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Cole a URL pública da imagem (ex: hospedada no Postimages, Imgur, etc). Lembre de clicar em <strong>Salvar Perfil</strong> para confirmar.
              </p>
            </div>

          </div>

          <Button onClick={handleSave} disabled={loading} className="gradient-primary text-white w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Perfil
          </Button>
        </div>
      </Card>

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

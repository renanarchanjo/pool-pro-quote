import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Search, Loader2, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import logoDark from "@/assets/simulapool-icon.png";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const Auth = () => {
  useForceLightTheme();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFound, setCnpjFound] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  const brazilStates = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
  ];

  // Fetch cities when state changes
  useEffect(() => {
    if (!state) {
      setCities([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`)
      .then(res => res.json())
      .then((data: any[]) => {
        setCities(data.map((m: any) => m.nome));
      })
      .catch(() => setCities([]));
  }, [state]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendConfirmation = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });
      if (error) throw error;
      toast.success("E-mail de confirmação reenviado! Verifique sua caixa de entrada e spam.");
      setResendCooldown(60);
    } catch (error: any) {
      if (error.message?.toLowerCase().includes("rate limit")) {
        setResendCooldown(120);
        toast.error("Você atingiu o limite de reenvio. Aguarde 2 minutos antes de tentar novamente.");
      } else {
        toast.error(error.message || "Erro ao reenviar e-mail");
      }
    } finally {
      setResendLoading(false);
    }
  }, [pendingEmail, resendCooldown, resendLoading]);

  useEffect(() => {
    const redirectByRole = async (userId: string) => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      const isSuperAdmin = roleData?.some((r: any) => r.role === "super_admin");
      navigate(isSuperAdmin ? "/matriz" : "/admin");
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectByRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        redirectByRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const lookupCNPJ = async () => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }

    setCnpjLoading(true);
    setCnpjFound(false);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      
      setRazaoSocial(data.razao_social || "");
      setNomeFantasia(data.nome_fantasia || data.razao_social || "");
      setCnpjFound(true);
      toast.success("Dados da empresa carregados!");
    } catch {
      toast.error("CNPJ não encontrado. Verifique o número.");
      setRazaoSocial("");
      setNomeFantasia("");
      setCnpjFound(false);
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!isLogin) {
      const digits = cnpj.replace(/\D/g, "");
      if (digits.length !== 14) {
        toast.error("Informe um CNPJ válido");
        return;
      }
      if (!razaoSocial) {
        toast.error("Busque o CNPJ para preencher os dados da empresa");
        return;
      }
      if (!city || !state) {
        toast.error("Preencha a cidade e o estado");
        return;
      }
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // If email not confirmed, show the confirmation screen
          if (error.message?.toLowerCase().includes("email not confirmed")) {
            setPendingEmail(email);
            setPendingConfirmation(true);
            setResendCooldown(0);
            return;
          }
          throw error;
        }
        toast.success("Login realizado com sucesso!");
      } else {
        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now();
        const cnpjDigits = cnpj.replace(/\D/g, "");
        
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Erro ao criar usuário");

        // Detect repeated signup (user already exists but unconfirmed)
        if (authData.user.identities && authData.user.identities.length === 0) {
          throw new Error("Este e-mail já está cadastrado. Verifique sua caixa de entrada ou faça login.");
        }

        // Use edge function to create store (bypasses RLS when email not confirmed)
        const { data: storeResult, error: storeError } = await supabase.functions.invoke("setup-store", {
          body: {
            userId: authData.user.id,
            storeName: nomeFantasia || razaoSocial,
            slug,
            city,
            state,
            cnpj: cnpjDigits,
            razaoSocial,
            nomeFantasia,
            fullName: nomeFantasia || razaoSocial,
          },
        });

        if (storeError) throw storeError;
        if (storeResult?.error) throw new Error(storeResult.error);

        if (authData.session) {
          toast.success("Loja criada com sucesso!");
          navigate("/admin", { replace: true });
        } else {
          setPendingEmail(email);
          setPendingConfirmation(true);
          setResendCooldown(60);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  if (pendingConfirmation) {
    return (
      <div className="min-h-screen gradient-pool flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-pool border-border/50">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-6">
              <img src={logoDark} alt="SIMULAPOOL" className="h-20 object-contain" />
            </div>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Confirme seu e-mail</h1>
            <p className="text-muted-foreground text-sm">
              Enviamos um link de confirmação para:
            </p>
            <p className="font-semibold text-foreground mt-1">{pendingEmail}</p>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 mb-6">
            <p>📧 Verifique sua <strong>caixa de entrada</strong> e <strong>spam/lixo eletrônico</strong></p>
            <p>⏳ O e-mail pode levar até 2 minutos para chegar</p>
            <p>🔗 Clique no link do e-mail para ativar sua conta</p>
          </div>

          <Button
            onClick={handleResendConfirmation}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full gradient-primary text-white font-display font-semibold"
          >
            {resendLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reenviando...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reenviar em {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reenviar e-mail de confirmação
              </>
            )}
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setPendingConfirmation(false);
                setIsLogin(true);
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Já confirmei, ir para login
            </button>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPendingConfirmation(false);
                setIsLogin(false);
              }}
            >
              Voltar ao cadastro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-pool flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-pool border-border/50">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logoDark} alt="SIMULAPOOL" className="h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Área do Lojista</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Entre com suas credenciais" : "Crie sua loja agora"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* CNPJ with auto-lookup */}
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    type="text"
                    value={cnpj}
                    onChange={(e) => {
                      setCnpj(formatCNPJ(e.target.value));
                      setCnpjFound(false);
                    }}
                    placeholder="00.000.000/0000-00"
                    disabled={loading || cnpjLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={lookupCNPJ}
                    disabled={loading || cnpjLoading || cnpj.replace(/\D/g, "").length !== 14}
                    className="shrink-0"
                  >
                    {cnpjLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : cnpjFound ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o CNPJ e clique na lupa para buscar
                </p>
              </div>

              {/* Auto-filled fields */}
              {cnpjFound && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div>
                    <Label htmlFor="razaoSocial" className="text-xs text-muted-foreground">Razão Social</Label>
                    <Input
                      id="razaoSocial"
                      value={razaoSocial}
                      readOnly
                      className="bg-background/50 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nomeFantasia" className="text-xs text-muted-foreground">Nome Fantasia</Label>
                    <Input
                      id="nomeFantasia"
                      value={nomeFantasia}
                      readOnly
                      className="bg-background/50 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* State and City */}
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select value={state} onValueChange={(v) => { setState(v); setCity(""); }} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilStates.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Select value={city} onValueChange={setCity} disabled={loading || !state}>
                    <SelectTrigger>
                      <SelectValue placeholder={state ? "Selecione a cidade" : "Selecione o estado primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white font-display font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>{isLogin ? "Entrar" : "Criar Loja"}</>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline font-medium"
            disabled={loading}
          >
            {isLogin ? "Ainda não tem loja? Cadastre-se grátis" : "Já tem conta? Entre"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Voltar ao Início
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;

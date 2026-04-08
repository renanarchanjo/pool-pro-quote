import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import logoIcon from "@/assets/logo-icon.png";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

type View = "login" | "forgot" | "forgot-sent";

const Login = () => {
  useForceLightTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState<View>("login");
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/admin");
      else setCheckingSession(false);
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas ou conta não aprovada.");
      return;
    }
    toast.success("Login realizado!");
    navigate("/admin");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação. Tente novamente.");
      return;
    }
    setView("forgot-sent");
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forgot password - email sent confirmation
  if (view === "forgot-sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-0 bg-white/95 backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-20 object-contain mb-4" />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-primary font-display">E-mail enviado!</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Enviamos um link de redefinição de senha para:
            </p>
            <p className="font-semibold text-foreground mt-1">{resetEmail}</p>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 mb-6">
            <p>📧 Verifique sua <strong>caixa de entrada</strong> e <strong>spam</strong></p>
            <p>⏳ O e-mail pode levar até 2 minutos para chegar</p>
            <p>🔗 Clique no link para criar uma nova senha</p>
          </div>

          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setView("login");
              setResetEmail("");
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Button>
        </Card>
      </div>
    );
  }

  // Forgot password form
  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-0 bg-white/95 backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-20 object-contain mb-4" />
            <h1 className="text-xl font-bold text-primary font-display">Esqueci minha senha</h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="resetEmail">E-mail</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full gradient-primary text-white font-semibold" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar link de recuperação
            </Button>
          </form>

          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setView("login");
                setResetEmail("");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-0 bg-white/95 backdrop-blur-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logoHorizontal} alt="SIMULAPOOL" className="h-24 object-contain mb-4" />
          <h1 className="text-xl font-bold text-primary font-display">Meu Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">Somente para usuários cadastrados</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="text-sm text-primary hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          <Button type="submit" className="w-full gradient-primary text-white font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-sm text-primary hover:underline font-medium"
          >
            Não tem cadastro? Cadastre-se grátis
          </button>
        </div>

        <div className="mt-4 pt-4 border-t">
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

export default Login;

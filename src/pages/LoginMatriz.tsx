import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

type View = "login" | "forgot" | "forgot-sent";

const heroGradient = "#0A1628";

const cardClass =
  "w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]";

const LoginMatriz = () => {
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
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "super_admin")
          .single();

        if (roleData) {
          navigate("/matriz");
          return;
        }
      }
      setCheckingSession(false);
    };
    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      toast.error("Credenciais inválidas.");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Acesso restrito. Esta área é exclusiva para administradores.");
      return;
    }

    setLoading(false);
    toast.success("Bem-vindo à Matriz!");
    navigate("/matriz");
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: heroGradient }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  // Forgot password - email sent confirmation
  if (view === "forgot-sent") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: heroGradient }}>
        <div className={cardClass}>
          <div className="flex flex-col items-center mb-6">
            <BrandLogo size="lg" className="mb-4 [&_span]:text-white" />
            <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-[#38BDF8]" />
            </div>
            <h1 className="text-xl font-bold text-white font-display">E-mail enviado!</h1>
            <p className="text-sm text-white/50 mt-2 text-center">
              Enviamos um link de redefinição de senha para:
            </p>
            <p className="font-semibold text-white mt-1">{resetEmail}</p>
          </div>

          <div className="space-y-3 text-sm text-white/60 bg-white/5 rounded-lg p-4 mb-6">
            <p>📧 Verifique sua <strong className="text-white/80">caixa de entrada</strong> e <strong className="text-white/80">spam</strong></p>
            <p>⏳ O e-mail pode levar até 2 minutos para chegar</p>
            <p>🔗 Clique no link para criar uma nova senha</p>
          </div>

          <Button
            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={() => {
              setView("login");
              setResetEmail("");
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: heroGradient }}>
        <div className={cardClass}>
          <div className="flex flex-col items-center mb-8">
            <BrandLogo size="lg" className="mb-4 [&_span]:text-white" />
            <h1 className="text-xl font-bold text-white font-display">Esqueci minha senha</h1>
            <p className="text-sm text-white/50 mt-1 text-center">
              Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="resetEmail" className="text-white/70">E-mail</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#38BDF8]/50"
              />
            </div>
            <Button type="submit" className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar link de recuperação
            </Button>
          </form>

          <div className="mt-6">
            <Button
              className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() => {
                setView("login");
                setResetEmail("");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: heroGradient }}>
      <div className={cardClass}>
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="lg" className="mb-4 [&_span]:text-white" />
          <h1 className="text-xl font-bold text-white font-display">Painel Matriz</h1>
          <p className="text-sm text-white/50 mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-white/70">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#38BDF8]/50"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-white/70">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#38BDF8]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="text-sm text-[#38BDF8] hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          <Button type="submit" className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Acessar Matriz
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-white/10">
          <Button
            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={() => navigate("/")}
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginMatriz;

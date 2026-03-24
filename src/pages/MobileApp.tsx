import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import logoDark from "@/assets/simulapool-icon.png";

const MobileApp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Se já logado, redireciona ao admin
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/admin");
      }
      setCheckingSession(false);
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      navigate("/admin");
    } catch (error: any) {
      toast.error(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos"
        : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-background px-6">
      {/* Logo / Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex justify-center mb-4">
          <img src={logoDark} alt="SIMULAPOOL" className="h-20 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">SIMULAPOOL</h1>
        <p className="text-sm text-muted-foreground mt-1">Área do Lojista</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4 mr-2" />
          )}
          Entrar
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-8">
        © {new Date().getFullYear()} SIMULAPOOL
      </p>
    </div>
  );
};

export default MobileApp;

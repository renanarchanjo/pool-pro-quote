import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const heroGradient =
  "linear-gradient(180deg, #0A1628 0%, #0C1A33 30%, #0D1F3C 50%, #0F2847 65%, #1A3A5C 78%, #3D6B8D 86%, #7AADCB 91%, #C5E2F0 95%, #FFFFFF 100%)";

const cardClass =
  "w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]";

const LoginMatriz = () => {
  useForceLightTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
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

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: heroGradient }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

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
          <Button type="submit" className="w-full bg-white text-[#0A1628] font-semibold hover:bg-white/90" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Acessar Matriz
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginMatriz;

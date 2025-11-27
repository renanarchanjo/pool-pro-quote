import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoDark from "@/assets/simulapool-dark.png";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/admin");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!isLogin && !name) {
      toast.error("Preencha o nome da loja");
      return;
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

        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        // Create store slug from email
        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now();
        
        // Sign up user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Erro ao criar usuário");

        // Create store
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .insert({ name, slug })
          .select()
          .single();

        if (storeError) throw storeError;

        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            store_id: storeData.id,
            full_name: name,
          });

        if (profileError) throw profileError;

        // Create owner role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "owner",
          });

        if (roleError) throw roleError;

        // Create default store settings
        const { error: settingsError } = await supabase
          .from("store_settings")
          .insert({
            store_id: storeData.id,
          });

        if (settingsError) throw settingsError;

        toast.success("Loja criada com sucesso! Você será redirecionado...");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

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
            <div>
              <Label htmlFor="name">Nome da Loja</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Minha Loja de Piscinas"
                disabled={loading}
              />
            </div>
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              disabled={loading}
            />
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

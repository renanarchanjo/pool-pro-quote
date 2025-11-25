import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Waves, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CategoryManager from "@/components/admin/CategoryManager";
import PoolModelManager from "@/components/admin/PoolModelManager";
import OptionalManager from "@/components/admin/OptionalManager";
import ProposalsView from "@/components/admin/ProposalsView";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Waves className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Painel Admin</span>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="models">Modelos</TabsTrigger>
            <TabsTrigger value="optionals">Opcionais</TabsTrigger>
            <TabsTrigger value="proposals">Propostas</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="models">
            <PoolModelManager />
          </TabsContent>

          <TabsContent value="optionals">
            <OptionalManager />
          </TabsContent>

          <TabsContent value="proposals">
            <ProposalsView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;

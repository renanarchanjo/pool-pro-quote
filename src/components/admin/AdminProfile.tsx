import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

const AdminProfile = () => {
  const { profile, store, refetch } = useStoreData();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Perfil atualizado!");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>
      <Card className="p-6 max-w-lg">
        <div className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Loja</Label>
            <Input value={store?.name || ""} disabled className="mt-2" />
          </div>
          <Button onClick={handleSave} disabled={loading} className="gradient-primary text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;

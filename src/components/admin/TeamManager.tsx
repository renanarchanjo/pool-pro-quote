import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserPlus, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  email?: string;
}

const TeamManager = () => {
  const { store, role } = useStoreData();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "seller",
  });

  useEffect(() => {
    if (store) loadMembers();
  }, [store]);

  const loadMembers = async () => {
    if (!store) return;
    try {
      // Get all profiles linked to this store
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("store_id", store.id);

      if (error) throw error;

      // Get roles for each profile
      const membersList: TeamMember[] = [];
      for (const profile of profiles || []) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
          .single();

        membersList.push({
          id: profile.id,
          full_name: profile.full_name,
          role: roleData?.role || "seller",
        });
      }

      setMembers(membersList);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Membro adicionado com sucesso!");
      setFormData({ email: "", password: "", full_name: "", role: "seller" });
      setShowForm(false);
      loadMembers();
    } catch (error: any) {
      console.error("Error inviting:", error);
      toast.error(error.message || "Erro ao convidar membro");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check it's not the current user
      if (memberId === session.user.id) {
        toast.error("Você não pode remover sua própria conta");
        return;
      }

      // Remove profile (will cascade)
      const { error } = await supabase
        .from("profiles")
        .update({ store_id: null })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Membro removido da equipe");
      loadMembers();
    } catch (error) {
      toast.error("Erro ao remover membro");
    }
  };

  const getRoleBadge = (memberRole: string) => {
    if (memberRole === "owner") {
      return <Badge className="bg-primary/10 text-primary border-primary/20">Admin</Badge>;
    }
    return <Badge variant="secondary">Colaborador</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "owner") {
    return (
      <div className="text-center p-8">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-muted-foreground">Apenas administradores podem gerenciar a equipe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Equipe</h2>
          <p className="text-muted-foreground text-sm">Gerencie os membros da sua loja</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Membro
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nome do colaborador"
                  />
                </div>
                <div>
                  <Label>Permissão</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Admin (acesso total)</SelectItem>
                      <SelectItem value="seller">Colaborador (dashboard + propostas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Senha Inicial *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
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
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="gradient-primary text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {submitting ? "Criando..." : "Adicionar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {(member.full_name || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{member.full_name || "Sem nome"}</p>
                  {getRoleBadge(member.role)}
                </div>
              </div>
              {member.role !== "owner" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{member.full_name}" perderá acesso à loja.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveMember(member.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeamManager;

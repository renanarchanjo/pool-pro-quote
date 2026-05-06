import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, RotateCcw, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_CONTRACT_CLAUSES, CLAUSE_PLACEHOLDERS, type ContractClause } from "@/lib/contractClauseDefaults";

interface Props {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContractClausesEditor({ storeId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clauses, setClauses] = useState<ContractClause[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("store_contract_clauses")
        .select("clauses")
        .eq("store_id", storeId)
        .maybeSingle();
      if (cancelled) return;
      const stored = (data?.clauses as unknown as ContractClause[] | undefined) || [];
      setClauses(stored.length ? stored : DEFAULT_CONTRACT_CLAUSES);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, storeId]);

  const updateClause = (idx: number, patch: Partial<ContractClause>) =>
    setClauses(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const addClause = () =>
    setClauses(prev => [...prev, { title: "NOVA CLÁUSULA", text: "" }]);

  const removeClause = (idx: number) =>
    setClauses(prev => prev.filter((_, i) => i !== idx));

  const moveClause = (idx: number, dir: -1 | 1) => {
    setClauses(prev => {
      const arr = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  };

  const resetToDefault = () => {
    if (!confirm("Restaurar todas as cláusulas para o padrão? Suas edições serão perdidas.")) return;
    setClauses(DEFAULT_CONTRACT_CLAUSES);
    toast.info("Cláusulas restauradas. Clique em 'Salvar' para aplicar.");
  };

  const save = async () => {
    if (clauses.some(c => !c.title.trim() || !c.text.trim())) {
      toast.error("Todas as cláusulas precisam ter título e texto.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("store_contract_clauses")
      .upsert({ store_id: storeId, clauses: clauses as any }, { onConflict: "store_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Cláusulas salvas! Aplicadas nos próximos contratos.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen sm:max-w-[96vw] sm:w-[96vw] sm:h-[94vh] sm:rounded-2xl rounded-none overflow-y-auto p-4 sm:p-8 pb-[env(safe-area-inset-bottom)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" /> Editor de Cláusulas do Contrato
          </DialogTitle>
          <DialogDescription>
            Personalize o texto jurídico das cláusulas do seu contrato. Use os marcadores abaixo para inserir dados dinâmicos.
          </DialogDescription>
        </DialogHeader>

        {/* Placeholders helper */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <div className="font-semibold mb-1.5">Marcadores disponíveis (clique para copiar):</div>
          <div className="flex flex-wrap gap-1.5">
            {CLAUSE_PLACEHOLDERS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => { navigator.clipboard.writeText(p.key); toast.success(`Copiado: ${p.key}`); }}
                className="px-2 py-0.5 rounded bg-background border border-border hover:border-primary/40 font-mono"
                title={p.label}
              >
                {p.key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {clauses.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">CLÁUSULA {i + 1}ª</span>
                  <Input
                    value={c.title}
                    onChange={e => updateClause(i, { title: e.target.value })}
                    placeholder="Título da cláusula"
                    className="text-sm font-semibold"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => moveClause(i, -1)} disabled={i === 0} title="Subir">↑</Button>
                    <Button size="icon" variant="ghost" onClick={() => moveClause(i, 1)} disabled={i === clauses.length - 1} title="Descer">↓</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeClause(i)} title="Remover" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={c.text}
                  onChange={e => updateClause(i, { text: e.target.value })}
                  onFocus={e => {
                    // Em mobile, o teclado virtual cobre o campo. Rolamos para garantir visibilidade.
                    setTimeout(() => {
                      e.currentTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 250);
                  }}
                  rows={8}
                  placeholder="Texto da cláusula..."
                  className="text-sm font-mono min-h-[180px] sm:min-h-[200px] leading-relaxed scroll-mt-24"
                />
              </div>
            ))}
            <Button variant="outline" onClick={addClause} className="w-full gap-1">
              <Plus className="w-4 h-4" /> Adicionar nova cláusula
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="ghost" onClick={resetToDefault} className="gap-1 sm:mr-auto">
            <RotateCcw className="w-4 h-4" /> Restaurar padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading} className="gap-1">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar cláusulas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

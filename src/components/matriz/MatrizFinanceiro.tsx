import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, FileDown, TrendingUp, TrendingDown, Wallet, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Tipo = "entrada" | "saida";

// SimulaPool Matriz — controle financeiro próprio (não vinculado a lojas)
const MATRIZ_STORE_ID = "00000000-0000-0000-0000-00005104a700";

interface Categoria { id: string; store_id: string; nome: string; tipo: Tipo; cor: string; }
interface Lancamento {
  id: string;
  store_id: string;
  categoria_id: string | null;
  descricao: string;
  valor: number;
  tipo: Tipo;
  data_lancamento: string;
  competencia: string;
  observacao: string | null;
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthOptions = () => {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -12; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: v, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
  }
  return out;
};

const MatrizFinanceiro = () => {
  const storeId = MATRIZ_STORE_ID;
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [yearLancamentos, setYearLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  const months = useMemo(monthOptions, []);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [competencia, setCompetencia] = useState<string>(currentMonth);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | Tipo>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [form, setForm] = useState({
    tipo: "saida" as Tipo,
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    categoria_id: "",
    observacao: "",
  });
  const [catForm, setCatForm] = useState({ nome: "", tipo: "saida" as Tipo, cor: "#6366f1" });

  useEffect(() => {
    loadAll();
  }, [competencia]);

  const loadAll = async () => {
    setLoading(true);
    const year = competencia.slice(0, 4);
    const [cats, lancs, yearLancs] = await Promise.all([
      supabase.from("financeiro_categorias").select("*").eq("store_id", storeId).order("nome"),
      supabase.from("financeiro_lancamentos").select("*").eq("store_id", storeId).eq("competencia", competencia).order("data_lancamento", { ascending: false }),
      supabase.from("financeiro_lancamentos").select("valor, tipo, competencia").eq("store_id", storeId).like("competencia", `${year}-%`),
    ]);
    setCategorias((cats.data || []) as Categoria[]);
    setLancamentos((lancs.data || []) as Lancamento[]);
    setYearLancamentos((yearLancs.data || []) as Lancamento[]);
    setLoading(false);
  };

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroTipo !== "todos" && l.tipo !== filtroTipo) return false;
      if (filtroCategoria !== "todas" && l.categoria_id !== filtroCategoria) return false;
      return true;
    });
  }, [lancamentos, filtroTipo, filtroCategoria]);

  const totals = useMemo(() => {
    const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
    const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
    const yearEntradas = yearLancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
    const yearSaidas = yearLancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
    return { entradas, saidas, resultado: entradas - saidas, ano: yearEntradas - yearSaidas };
  }, [lancamentos, yearLancamentos]);

  const breakdownByCategoria = useMemo(() => {
    const map = new Map<string, number>();
    lancamentos.forEach((l) => {
      if (!l.categoria_id) return;
      map.set(l.categoria_id, (map.get(l.categoria_id) || 0) + Number(l.valor));
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
    return categorias.map((c) => {
      const val = map.get(c.id) || 0;
      return { ...c, total: val, percent: (val / total) * 100 };
    }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  }, [lancamentos, categorias]);

  const openNew = () => {
    setEditing(null);
    setForm({ tipo: "saida", descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria_id: "", observacao: "" });
    setModalOpen(true);
  };

  const openEdit = (l: Lancamento) => {
    setEditing(l);
    setForm({
      tipo: l.tipo,
      descricao: l.descricao,
      valor: String(l.valor),
      data: l.data_lancamento,
      categoria_id: l.categoria_id || "",
      observacao: l.observacao || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.descricao || !form.valor || !form.data) {
      toast.error("Preencha descrição, valor e data");
      return;
    }
    const payload = {
      store_id: storeId,
      tipo: form.tipo,
      descricao: form.descricao,
      valor: Number(form.valor),
      data_lancamento: form.data,
      categoria_id: form.categoria_id || null,
      observacao: form.observacao || null,
    };
    const { data: { user } } = await supabase.auth.getUser();
    if (editing) {
      const { error } = await supabase.from("financeiro_lancamentos").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Lançamento atualizado");
    } else {
      const { error } = await supabase.from("financeiro_lancamentos").insert({ ...payload, created_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success("Lançamento criado");
    }
    setModalOpen(false);
    loadAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("financeiro_lancamentos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    loadAll();
  };

  const saveCategoria = async () => {
    if (!catForm.nome || !storeId) { toast.error("Preencha o nome da categoria"); return; }
    const { error } = await supabase.from("financeiro_categorias").insert({
      store_id: storeId,
      nome: catForm.nome,
      tipo: catForm.tipo,
      cor: catForm.cor,
    });
    if (error) return toast.error(error.message);
    toast.success("Categoria criada");
    setCatForm({ nome: "", tipo: "saida", cor: "#6366f1" });
    loadAll();
  };

  const removeCategoria = async (id: string) => {
    if (!confirm("Excluir esta categoria? Lançamentos vinculados ficarão sem categoria.")) return;
    const { error } = await supabase.from("financeiro_categorias").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    loadAll();
  };

  const exportPDF = () => {
    const periodLabel = months.find((m) => m.value === competencia)?.label || competencia;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("SimulaPool — Controle Financeiro Matriz", 14, 18);
    doc.setFontSize(11);
    doc.text(`Período: ${periodLabel}`, 14, 26);

    doc.setFontSize(13);
    doc.text("Resumo Executivo", 14, 44);
    autoTable(doc, {
      startY: 48,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de entradas", BRL(totals.entradas)],
        ["Total de saídas", BRL(totals.saidas)],
        ["Resultado do período", BRL(totals.resultado)],
      ],
      theme: "striped",
      headStyles: { fillColor: [14, 165, 233] },
    });

    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(13);
    doc.text("Breakdown por categoria", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Categoria", "Tipo", "Valor", "%"]],
      body: breakdownByCategoria.map((c) => [c.nome, c.tipo, BRL(c.total), `${c.percent.toFixed(1)}%`]),
      theme: "striped",
      headStyles: { fillColor: [14, 165, 233] },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(13);
    doc.text("Detalhamento dos lançamentos", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
      body: filteredLancamentos.map((l) => [
        new Date(l.data_lancamento + "T00:00:00").toLocaleDateString("pt-BR"),
        l.descricao,
        categorias.find((c) => c.id === l.categoria_id)?.nome || "-",
        l.tipo,
        BRL(Number(l.valor)),
      ]),
      theme: "grid",
      headStyles: { fillColor: [14, 165, 233] },
      styles: { fontSize: 9 },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")} — Página ${i}/${pageCount}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    }

    doc.save(`financeiro-simulapool-${competencia}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger className="w-[200px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => setCatModalOpen(true)} title="Nova categoria"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF}><FileDown className="w-4 h-4 mr-2" />Exportar PDF</Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo lançamento</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Entradas do mês</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{BRL(totals.entradas)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Saídas do mês</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{BRL(totals.saidas)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Resultado do mês</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className={`text-xl font-bold ${totals.resultado >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{BRL(totals.resultado)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Acumulado do ano</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className={`text-xl font-bold ${totals.ano >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{BRL(totals.ano)}</div>
        </Card>
      </div>

      {/* Breakdown por categoria */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Resumo por categoria</h3>
        {breakdownByCategoria.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem lançamentos no período.</p>
        ) : (
          <div className="space-y-3">
            {breakdownByCategoria.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.cor }} />
                    <span className="font-medium">{c.nome}</span>
                    <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                  </div>
                  <span className="font-semibold">{BRL(c.total)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.percent}%`, background: c.cor }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLancamentos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum lançamento</TableCell></TableRow>
              ) : filteredLancamentos.map((l) => {
                const cat = categorias.find((c) => c.id === l.categoria_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(l.data_lancamento + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{l.descricao}</TableCell>
                    <TableCell>
                      {cat ? (
                        <Badge style={{ background: cat.cor, color: "#fff" }} className="text-[11px]">{cat.nome}</Badge>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.tipo === "entrada" ? "default" : "destructive"} className="text-[11px]">{l.tipo}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${l.tipo === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>{BRL(Number(l.valor))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button type="button" className="flex-1" variant={form.tipo === "entrada" ? "default" : "outline"} onClick={() => setForm({ ...form, tipo: "entrada" })}>Entrada</Button>
              <Button type="button" className="flex-1" variant={form.tipo === "saida" ? "default" : "outline"} onClick={() => setForm({ ...form, tipo: "saida" })}>Saída</Button>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <div className="flex items-center gap-2">
                <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categorias.filter((c) => c.tipo === form.tipo).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => { setCatForm({ nome: "", tipo: form.tipo, cor: "#6366f1" }); setCatModalOpen(true); }} title="Nova categoria"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nova categoria */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button type="button" className="flex-1" variant={catForm.tipo === "entrada" ? "default" : "outline"} onClick={() => setCatForm({ ...catForm, tipo: "entrada" })}>Entrada</Button>
                <Button type="button" className="flex-1" variant={catForm.tipo === "saida" ? "default" : "outline"} onClick={() => setCatForm({ ...catForm, tipo: "saida" })}>Saída</Button>
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={catForm.cor} onChange={(e) => setCatForm({ ...catForm, cor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
                <Input value={catForm.cor} onChange={(e) => setCatForm({ ...catForm, cor: e.target.value })} className="flex-1" />
              </div>
            </div>
            <Button onClick={saveCategoria} className="w-full"><Tag className="w-4 h-4 mr-2" />Adicionar categoria</Button>

            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Categorias existentes ({categorias.length})</Label>
              <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                {categorias.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria criada</p>
                ) : categorias.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                      <span className="text-sm font-medium truncate">{c.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeCategoria(c.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatrizFinanceiro;

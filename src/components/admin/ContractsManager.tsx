import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, Plus, Trash2, Download, Upload, FileCheck2, Ban, Loader2, ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import ContractClausesEditor from "./ContractClausesEditor";

type Status = "rascunho" | "enviado" | "aguardando_assinatura" | "assinado" | "cancelado";
const STATUS_LABEL: Record<Status, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aguardando_assinatura: "Aguardando Assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};
const STATUS_BADGE: Record<Status, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  aguardando_assinatura: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  assinado: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

interface ContractRow {
  id: string;
  status: Status;
  created_at: string;
  pdf_path: string | null;
  signed_pdf_path: string | null;
  buyer_name: string;
  pool_model: string | null;
  total_value: number;
  created_by: string | null;
  member_name: string;
}

interface Installment { cheque_number: string; value: string; due_date: string }

interface FormState {
  proposal_id: string | null;
  buyer: { name: string; rg: string; cpf: string; address: string; city: string; phone: string };
  product: {
    pool_model: string; brand: string; size: string; color: string;
    total_value: string; payment_conditions: string;
    contract_date: string; city_forum: string;
  };
  installments: Installment[];
}

const emptyForm: FormState = {
  proposal_id: null,
  buyer: { name: "", rg: "", cpf: "", address: "", city: "", phone: "" },
  product: {
    pool_model: "", brand: "", size: "", color: "",
    total_value: "", payment_conditions: "",
    contract_date: new Date().toISOString().slice(0, 10),
    city_forum: "",
  },
  installments: [],
};

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const ContractsManager = () => {
  const { store, role } = useStoreData();
  const isOwner = role === "owner";
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Status>("all");

  const [open, setOpen] = useState(false);
  const [clausesOpen, setClausesOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalQuery, setProposalQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!store?.id) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    let query = supabase
      .from("contracts")
      .select("id, status, created_at, pdf_path, signed_pdf_path, created_by, contract_buyer_data(name), contract_product_data(pool_model, total_value)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    // Colaborador: vê só os próprios contratos
    if (!isOwner && userId) query = query.eq("created_by", userId);
    const { data, error } = await query;
    if (error) { toast.error("Erro ao carregar contratos"); setLoading(false); return; }

    const rowsBase = (data || []).map((r: any) => ({
      id: r.id, status: r.status, created_at: r.created_at,
      pdf_path: r.pdf_path, signed_pdf_path: r.signed_pdf_path,
      buyer_name: r.contract_buyer_data?.name || "—",
      pool_model: r.contract_product_data?.pool_model || null,
      total_value: Number(r.contract_product_data?.total_value || 0),
      created_by: r.created_by || null,
      member_name: "—",
    }));

    // Para owner: buscar nomes dos membros
    if (isOwner) {
      const ids = Array.from(new Set(rowsBase.map(r => r.created_by).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map = new Map((profs || []).map((p: any) => [p.id, p.full_name || "—"]));
        rowsBase.forEach(r => { if (r.created_by) r.member_name = map.get(r.created_by) || "—"; });
      }
    }

    setRows(rowsBase);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store?.id, isOwner]);

  const filtered = useMemo(() => filter === "all" ? rows : rows.filter(r => r.status === filter), [rows, filter]);

  // Proposals search
  useEffect(() => {
    if (!open || !store?.id) return;
    const t = setTimeout(async () => {
      let q = supabase.from("proposals")
        .select("id, customer_name, customer_whatsapp, total_price, created_at")
        .eq("store_id", store.id).order("created_at", { ascending: false }).limit(20);
      if (proposalQuery.trim()) q = q.ilike("customer_name", `%${proposalQuery.trim()}%`);
      const { data } = await q;
      setProposals(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [open, proposalQuery, store?.id]);

  const openNew = () => { setForm(emptyForm); setProposalQuery(""); setOpen(true); };

  const linkProposal = async (p: any) => {
    // Fetch enriched proposal data (model + brand + dimensions)
    const { data: full } = await supabase
      .from("proposals")
      .select(`
        id, customer_name, customer_city, customer_whatsapp, total_price,
        pool_models (
          name, length, width, depth,
          categories ( name, brands ( name ) )
        )
      `)
      .eq("id", p.id)
      .maybeSingle();

    const src: any = full || p;
    const pm: any = src.pool_models || null;
    const brandName = pm?.categories?.brands?.name || pm?.categories?.name || "";
    const modelName = pm?.name || "";
    const dims =
      pm?.length && pm?.width
        ? `${pm.length}m x ${pm.width}m${pm.depth ? ` x ${pm.depth}m` : ""}`
        : "";

    setForm(prev => ({
      ...prev,
      proposal_id: src.id,
      buyer: {
        ...prev.buyer,
        name: src.customer_name || prev.buyer.name,
        phone: src.customer_whatsapp || prev.buyer.phone,
        city: src.customer_city || prev.buyer.city,
      },
      product: {
        ...prev.product,
        pool_model: modelName || prev.product.pool_model,
        brand: brandName || prev.product.brand,
        size: dims || prev.product.size,
        total_value: String(src.total_price ?? prev.product.total_value ?? ""),
        city_forum: prev.product.city_forum || src.customer_city || "",
      },
    }));
    toast.success("Proposta vinculada — dados preenchidos");
  };

  const addInstallment = () => setForm(p => ({ ...p, installments: [...p.installments, { cheque_number: "", value: "", due_date: "" }] }));
  const updInstallment = (i: number, k: keyof Installment, v: string) =>
    setForm(p => ({ ...p, installments: p.installments.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }));
  const rmInstallment = (i: number) => setForm(p => ({ ...p, installments: p.installments.filter((_, idx) => idx !== i) }));

  const fetchSellerData = async (cnpj: string) => {
    const clean = (cnpj || "").replace(/\D/g, "");
    if (!clean || clean.length !== 14) return null;
    try {
      const r = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`);
      if (!r.ok) return null;
      const j = await r.json();
      const e = j.estabelecimento || {};
      // Endereço completo: tipo + logradouro + número + complemento, bairro
      const ruaNumero = [e.tipo_logradouro, e.logradouro, e.numero].filter(Boolean).join(" ");
      const partes = [
        ruaNumero,
        e.complemento,
        e.bairro ? `Bairro ${e.bairro}` : null,
      ].filter(Boolean);
      const address = partes.join(", ");
      // CEP formatado 00000-000
      const cepDigits = (e.cep || "").replace(/\D/g, "");
      const cep = cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : (e.cep || "");
      // Telefone: tenta principal e secundário
      let phone = "";
      if (e.ddd1 && e.telefone1) phone = `(${e.ddd1}) ${e.telefone1}`;
      else if (e.ddd2 && e.telefone2) phone = `(${e.ddd2}) ${e.telefone2}`;
      else phone = store?.whatsapp || "";
      return {
        company_name: j.razao_social || store?.name || "",
        cnpj: clean,
        address: address || "",
        city: e.cidade?.nome || store?.city || "",
        state: e.estado?.sigla || store?.state || "",
        cep,
        phone,
        website: "",
        email: e.email || "",
      };
    } catch { return null; }
  };

  const saveContract = async (generatePdf: boolean) => {
    if (!store?.id) return;
    if (!form.buyer.name.trim()) { toast.error("Nome do comprador obrigatório"); return; }
    if (!form.product.pool_model.trim() || !form.product.brand.trim()) { toast.error("Modelo e marca obrigatórios"); return; }
    if (!form.product.total_value) { toast.error("Valor total obrigatório"); return; }
    setSaving(true);
    const tId = toast.loading(generatePdf ? "Gerando contrato..." : "Salvando rascunho...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const { data: contract, error: cErr } = await supabase.from("contracts").insert({
        store_id: store.id,
        proposal_id: form.proposal_id,
        status: "rascunho",
        created_by: userId,
      }).select("id").single();
      if (cErr) throw cErr;

      const cid = contract.id;

      // Buyer
      const { error: bErr } = await supabase.from("contract_buyer_data").insert({
        contract_id: cid, ...form.buyer,
      });
      if (bErr) throw bErr;

      // Product
      const { error: pErr } = await supabase.from("contract_product_data").insert({
        contract_id: cid,
        pool_model: form.product.pool_model,
        brand: form.product.brand,
        size: form.product.size,
        color: form.product.color,
        total_value: parseFloat(form.product.total_value) || 0,
        payment_conditions: form.product.payment_conditions,
        payment_installments: form.installments.filter(i => i.cheque_number || i.value || i.due_date)
          .map(i => ({ cheque_number: i.cheque_number, value: parseFloat(i.value) || 0, due_date: i.due_date || null })),
        contract_date: form.product.contract_date,
        city_forum: form.product.city_forum || form.buyer.city,
      });
      if (pErr) throw pErr;

      // Seller data — usa dados salvos da loja (Minha Conta); fallback API CNPJ
      const { data: storeFull } = await supabase
        .from("stores")
        .select("cnpj, razao_social, name, address, city, state, cep, whatsapp, company_email")
        .eq("id", store.id)
        .maybeSingle();

      const hasStoredData = !!(storeFull?.address && storeFull?.cep);
      const sellerData = hasStoredData
        ? {
            company_name: storeFull?.razao_social || storeFull?.name || store.name || "",
            cnpj: (storeFull?.cnpj || "").replace(/\D/g, ""),
            address: storeFull?.address || "",
            city: storeFull?.city || "",
            state: storeFull?.state || "",
            cep: storeFull?.cep || "",
            phone: storeFull?.whatsapp || "",
            website: "",
            email: storeFull?.company_email || "",
          }
        : (await fetchSellerData(storeFull?.cnpj || "")) || {
            company_name: storeFull?.razao_social || storeFull?.name || store.name || "",
            cnpj: (storeFull?.cnpj || "").replace(/\D/g, ""),
            address: storeFull?.address || "",
            city: storeFull?.city || store.city || "",
            state: storeFull?.state || store.state || "",
            cep: storeFull?.cep || "",
            phone: storeFull?.whatsapp || store.whatsapp || "",
            website: "",
            email: storeFull?.company_email || "",
          };
      const { error: sErr } = await supabase.from("contract_seller_data").insert({ contract_id: cid, ...sellerData });
      if (sErr) throw sErr;

      if (generatePdf) {
        const { data, error } = await supabase.functions.invoke("generate-contract-pdf", { body: { contract_id: cid } });
        if (error) throw new Error(error?.message || "Falha ao gerar PDF");
        toast.success("Contrato gerado", { id: tId });
        const { data: row } = await supabase.from("contracts").select("pdf_path, contract_buyer_data(name)").eq("id", cid).maybeSingle();
        const buyerName = (row as any)?.contract_buyer_data?.name || "";
        if (row?.pdf_path) await downloadPdf(row.pdf_path, { buyerName, date: new Date().toISOString() });
      } else {
        toast.success("Rascunho salvo", { id: tId });
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro: " + (e?.message || "desconhecido"), { id: tId });
    } finally { setSaving(false); }
  };

  const generatePdf = async (id: string) => {
    setBusyId(id);
    const tId = toast.loading("Gerando PDF...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract-pdf", { body: { contract_id: id } });
      if (error) throw new Error(error?.message || "Falha");
      toast.success("PDF gerado", { id: tId });
      const { data: row } = await supabase.from("contracts").select("pdf_path, created_at, contract_buyer_data(name)").eq("id", id).maybeSingle();
      const buyerName = (row as any)?.contract_buyer_data?.name || "";
      if (row?.pdf_path) await downloadPdf(row.pdf_path, { buyerName, date: row.created_at });
      await load();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || "desconhecido"), { id: tId });
    } finally { setBusyId(null); }
  };

  const downloadPdf = async (path: string | null, opts?: { buyerName?: string; date?: string; signed?: boolean }) => {
    if (!path) return toast.error("PDF não disponível");
    try {
      const { data, error } = await supabase.storage.from("contracts").download(path);
      if (error || !data) throw error || new Error("falha ao baixar");
      const blobUrl = URL.createObjectURL(data);

      // Nome amigável: Contrato_Cliente_DD-MM-AAAA[_Assinado].pdf
      const slugify = (s: string) =>
        (s || "Cliente")
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 60) || "Cliente";
      const dateRaw = opts?.date ? new Date(opts.date) : new Date();
      const dd = String(dateRaw.getDate()).padStart(2, "0");
      const mm = String(dateRaw.getMonth() + 1).padStart(2, "0");
      const yyyy = dateRaw.getFullYear();
      const fileName = `Contrato_${slugify(opts?.buyerName || "")}_${dd}-${mm}-${yyyy}${opts?.signed ? "_Assinado" : ""}.pdf`;

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e: any) {
      toast.error("Erro ao baixar PDF: " + (e?.message || "desconhecido"));
    }
  };

  const setStatus = async (id: string, status: Status) => {
    setBusyId(id);
    const patch: any = { status };
    if (status === "assinado") patch.signed_at = new Date().toISOString();
    const { error } = await supabase.from("contracts").update(patch).eq("id", id);
    setBusyId(null);
    if (error) return toast.error("Erro ao atualizar");
    toast.success("Status atualizado");
    await load();
  };

  const removeContract = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Contrato excluído"); await load();
  };

  const uploadSigned = async (id: string, file: File) => {
    if (!store?.id) return;
    setBusyId(id);
    const path = `${store.id}/${id}_assinado.pdf`;
    const { error } = await supabase.storage.from("contracts").upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
    if (error) { setBusyId(null); return toast.error("Erro no upload: " + error.message); }
    const { error: uErr } = await supabase.from("contracts").update({ signed_pdf_path: path, signed_at: new Date().toISOString() }).eq("id", id);
    setBusyId(null);
    if (uErr) return toast.error("Erro ao salvar");
    toast.success("Contrato assinado anexado"); await load();
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-[400px]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[18px] font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Contratos
          </h1>
          <p className="text-[13px] text-muted-foreground">Gere e gerencie contratos de compra e venda.</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button variant="outline" onClick={() => setClausesOpen(true)} className="gap-1">
              <ScrollText className="w-4 h-4" /> Editar Cláusulas
            </Button>
          )}
          <Button onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> Novo Contrato</Button>
        </div>
      </div>

      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Label className="text-xs">Filtrar:</Label>
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(STATUS_LABEL) as Status[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum contrato encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Valor</TableHead>
                  {isOwner && <TableHead>Membro</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.buyer_name}</TableCell>
                    <TableCell>{r.pool_model || "—"}</TableCell>
                    <TableCell>{fmtBRL(r.total_value)}</TableCell>
                    {isOwner && <TableCell className="text-xs">{r.member_name}</TableCell>}
                    <TableCell><Badge className={STATUS_BADGE[r.status]} variant="outline">{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <ContractActions
                        row={r}
                        busy={busyId === r.id}
                        isOwner={isOwner}
                        onGenerate={() => generatePdf(r.id)}
                        onDownload={() => downloadPdf(r.pdf_path, { buyerName: r.buyer_name, date: r.created_at })}
                        onDownloadSigned={() => downloadPdf(r.signed_pdf_path, { buyerName: r.buyer_name, date: r.created_at, signed: true })}
                        onSetStatus={(s) => setStatus(r.id, s)}
                        onDelete={() => removeContract(r.id)}
                        onUploadSigned={(f) => uploadSigned(r.id, f)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 pb-[env(safe-area-inset-bottom)]">
          <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Seção 3 — Vinculação proposta (no topo p/ pré-preencher) */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Vincular Proposta (opcional)</h3>
              <Input placeholder="Buscar proposta por nome do cliente..." value={proposalQuery} onChange={e => setProposalQuery(e.target.value)} />
              {proposals.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md divide-y">
                  {proposals.map(p => (
                    <button key={p.id} type="button" onClick={() => linkProposal(p)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${form.proposal_id === p.id ? "bg-primary/10" : ""}`}>
                      <div className="font-medium">{p.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{p.customer_whatsapp} · {fmtBRL(p.total_price || 0)}</div>
                    </button>
                  ))}
                </div>
              )}
              {form.proposal_id && <p className="text-xs text-primary mt-1">Proposta vinculada ✓</p>}
            </section>

            {/* Seção 1 — Comprador */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Dados do Comprador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Nome completo *</Label><Input value={form.buyer.name} onChange={e => setForm(p => ({ ...p, buyer: { ...p.buyer, name: e.target.value } }))} /></div>
                <div><Label>Telefone</Label><Input value={form.buyer.phone} onChange={e => setForm(p => ({ ...p, buyer: { ...p.buyer, phone: e.target.value } }))} /></div>
                <div><Label>RG *</Label><Input value={form.buyer.rg} onChange={e => setForm(p => ({ ...p, buyer: { ...p.buyer, rg: e.target.value } }))} /></div>
                <div><Label>CPF *</Label><Input value={form.buyer.cpf} onChange={e => setForm(p => ({ ...p, buyer: { ...p.buyer, cpf: e.target.value } }))} /></div>
                <div className="md:col-span-2"><Label>Endereço *</Label><Input value={form.buyer.address} onChange={e => setForm(p => ({ ...p, buyer: { ...p.buyer, address: e.target.value } }))} /></div>
                <div><Label>Cidade *</Label><Input value={form.buyer.city} onChange={e => setForm(p => ({ ...p, buyer: { ...p.buyer, city: e.target.value } }))} /></div>
              </div>
            </section>

            {/* Seção 2 — Produto */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Dados do Produto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Modelo *</Label><Input value={form.product.pool_model} onChange={e => setForm(p => ({ ...p, product: { ...p.product, pool_model: e.target.value } }))} /></div>
                <div><Label>Marca *</Label><Input value={form.product.brand} onChange={e => setForm(p => ({ ...p, product: { ...p.product, brand: e.target.value } }))} /></div>
                <div><Label>Tamanho * (ex: 5x2,5x1,40)</Label><Input value={form.product.size} onChange={e => setForm(p => ({ ...p, product: { ...p.product, size: e.target.value } }))} /></div>
                <div><Label>Cor *</Label><Input value={form.product.color} onChange={e => setForm(p => ({ ...p, product: { ...p.product, color: e.target.value } }))} /></div>
                <div><Label>Valor total (R$) *</Label><Input type="number" step="0.01" value={form.product.total_value} onChange={e => setForm(p => ({ ...p, product: { ...p.product, total_value: e.target.value } }))} /></div>
                <div><Label>Data do contrato *</Label><Input type="date" value={form.product.contract_date} onChange={e => setForm(p => ({ ...p, product: { ...p.product, contract_date: e.target.value } }))} /></div>
                <div className="md:col-span-2"><Label>Foro (cidade)</Label><Input value={form.product.city_forum} placeholder="Padrão: cidade do comprador" onChange={e => setForm(p => ({ ...p, product: { ...p.product, city_forum: e.target.value } }))} /></div>
                <div className="md:col-span-2"><Label>Condições de pagamento *</Label>
                  <Textarea rows={3} value={form.product.payment_conditions} onChange={e => setForm(p => ({ ...p, product: { ...p.product, payment_conditions: e.target.value } }))}
                    placeholder="Ex: R$ 11.000 na entrega + R$ 11.000 na instalação" /></div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label>Cheques (opcional)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addInstallment} className="gap-1"><Plus className="w-3 h-3" /> Adicionar</Button>
                </div>
                {form.installments.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <Input className="col-span-3" placeholder="Nº" value={it.cheque_number} onChange={e => updInstallment(i, "cheque_number", e.target.value)} />
                    <Input className="col-span-4" type="number" step="0.01" placeholder="Valor" value={it.value} onChange={e => updInstallment(i, "value", e.target.value)} />
                    <Input className="col-span-4" type="date" value={it.due_date} onChange={e => updInstallment(i, "due_date", e.target.value)} />
                    <Button className="col-span-1" type="button" size="icon" variant="ghost" onClick={() => rmInstallment(i)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" disabled={saving} onClick={() => saveContract(false)}>Salvar Rascunho</Button>
            <Button disabled={saving} onClick={() => saveContract(true)} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
              Gerar Contrato PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {store?.id && (
        <ContractClausesEditor
          storeId={store.id}
          open={clausesOpen}
          onOpenChange={setClausesOpen}
        />
      )}
    </div>
  );
};

const ContractActions = ({ row, busy, isOwner, onGenerate, onDownload, onDownloadSigned, onSetStatus, onDelete, onUploadSigned }: {
  row: ContractRow; busy: boolean; isOwner: boolean;
  onGenerate: () => void; onDownload: () => void; onDownloadSigned: () => void;
  onSetStatus: (s: Status) => void; onDelete: () => void; onUploadSigned: (f: File) => void;
}) => {
  const fileId = `signed-${row.id}`;
  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {row.status === "rascunho" && (
        <>
          <Button size="sm" variant="outline" onClick={onGenerate} disabled={busy}><FileCheck2 className="w-3.5 h-3.5 mr-1" />Gerar PDF</Button>
          {isOwner && <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy}><Trash2 className="w-3.5 h-3.5" /></Button>}
        </>
      )}
      {row.status === "enviado" && (
        <>
          <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => onSetStatus("aguardando_assinatura")} disabled={busy}>Aguardando</Button>
          {isOwner && <Button size="sm" variant="ghost" onClick={() => onSetStatus("cancelado")} disabled={busy}><Ban className="w-3.5 h-3.5" /></Button>}
        </>
      )}
      {row.status === "aguardando_assinatura" && (
        <>
          <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => onSetStatus("assinado")} disabled={busy}>Marcar Assinado</Button>
          {isOwner && <Button size="sm" variant="ghost" onClick={() => onSetStatus("cancelado")} disabled={busy}><Ban className="w-3.5 h-3.5" /></Button>}
        </>
      )}
      {row.status === "assinado" && (
        <>
          <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
          {row.signed_pdf_path && <Button size="sm" variant="outline" onClick={onDownloadSigned} disabled={busy}>Assinado</Button>}
          <label htmlFor={fileId}>
            <input id={fileId} type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadSigned(f); e.target.value = ""; }} />
            <Button size="sm" variant="outline" asChild disabled={busy}>
              <span className="cursor-pointer"><Upload className="w-3.5 h-3.5 mr-1" />Upload</span>
            </Button>
          </label>
        </>
      )}
      {row.status === "cancelado" && (
        <Button size="sm" variant="ghost" disabled>Cancelado</Button>
      )}
      {isOwner && row.status !== "rascunho" && (
        <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy} title="Excluir contrato" className="text-destructive hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

export default ContractsManager;

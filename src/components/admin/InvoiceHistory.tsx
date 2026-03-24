import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink, Download, Receipt } from "lucide-react";

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  created: string | null;
  period_start: string | null;
  period_end: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  open: { label: "Em aberto", variant: "secondary" },
  draft: { label: "Rascunho", variant: "outline" },
  void: { label: "Cancelada", variant: "destructive" },
  uncollectible: { label: "Inadimplente", variant: "destructive" },
};

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke("list-invoices");
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInvoices(data?.invoices || []);
    } catch (err: any) {
      console.error("Error loading invoices:", err);
      setError(err.message || "Erro ao carregar faturas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Histórico de Faturas</h2>
        <p className="text-muted-foreground text-sm">Acompanhe todos os seus pagamentos e faturas</p>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {invoices.length === 0 && !error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">Nenhuma fatura registrada ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">
              As faturas aparecerão aqui quando você assinar um plano.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const st = statusMap[inv.status] || { label: inv.status, variant: "outline" as const };
            return (
              <Card key={inv.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{inv.description}</p>
                        <Badge variant={st.variant} className="text-xs shrink-0">
                          {st.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.number ? `#${inv.number}` : ""} • {fmtDate(inv.created)}
                        {inv.period_start && inv.period_end && (
                          <> • Período: {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                    <span className="text-lg font-bold text-foreground">{fmt(inv.amount)}</span>
                    <div className="flex gap-1">
                      {inv.hosted_invoice_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(inv.hosted_invoice_url!, "_blank")}
                          title="Ver fatura"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {inv.invoice_pdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(inv.invoice_pdf!, "_blank")}
                          title="Baixar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;

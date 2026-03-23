import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_date: string | null;
  period_start: string | null;
  period_end: string | null;
  stores: { name: string } | null;
  subscription_plans: { name: string } | null;
}

const MatrizPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payment_history")
      .select("*, stores(name), subscription_plans(name)")
      .order("payment_date", { ascending: false });

    setPayments((data as any) || []);
    setLoading(false);
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "-";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      paid: { className: "bg-green-500/10 text-green-600 border-green-500/20", label: "Pago" },
      pending: { className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Pendente" },
      failed: { className: "bg-red-500/10 text-red-600 border-red-500/20", label: "Falhou" },
      refunded: { className: "bg-gray-500/10 text-gray-600 border-gray-500/20", label: "Estornado" },
    };
    const s = map[status] || { className: "bg-gray-500/10 text-gray-600", label: status };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Histórico de Pagamentos</h1>
        <p className="text-muted-foreground">{payments.length} pagamentos registrados</p>
      </div>

      {payments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os pagamentos aparecerão aqui quando os lojistas começarem a assinar os planos.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.stores?.name || "Loja removida"}</span>
                    {statusBadge(p.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {p.subscription_plans?.name || "-"} · {formatDate(p.payment_date)}
                    {p.period_start && p.period_end && (
                      <span> · Período: {formatDate(p.period_start)} - {formatDate(p.period_end)}</span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold">{formatCurrency(p.amount)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatrizPayments;

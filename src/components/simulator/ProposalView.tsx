import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, MessageCircle, Printer, Mail, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";

interface PoolModel {
  name: string;
  length?: number | null;
  width?: number | null;
  depth?: number | null;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
  payment_terms?: string | null;
}

interface Optional {
  name: string;
  price: number;
}

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface ProposalViewProps {
  model: PoolModel;
  selectedOptionals: Optional[];
  customerData: CustomerData;
  category: string;
  onBack: () => void;
  autoDownload?: boolean;
  storeSettings?: {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  } | null;
  storeName?: string | null;
  storeCity?: string | null;
  storeState?: string | null;
}

const ProposalView = ({
  model,
  selectedOptionals,
  customerData,
  category,
  onBack,
  autoDownload = false,
  storeSettings,
  storeName,
  storeCity,
  storeState,
}: ProposalViewProps) => {
  const hasAutoDownloaded = useRef(false);
  const optionalsTotal = selectedOptionals.reduce((sum, opt) => sum + opt.price, 0);
  const totalPrice = model.base_price + optionalsTotal;
  const today = new Date().toLocaleDateString("pt-BR");
  const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");

  const primaryColor = storeSettings?.primary_color || "#0ea5e9";
  const secondaryColor = storeSettings?.secondary_color || "#06b6d4";

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const generateWhatsAppMessage = () => {
    let message = `🏊‍♂️ *PROPOSTA - PISCINA DE FIBRA*\n\n`;
    message += `📋 *Dados do Cliente:*\n`;
    message += `Nome: ${customerData.name}\nCidade: ${customerData.city}\n\n`;
    message += `🏊 *Categoria:* ${category}\n🎯 *Modelo:* ${model.name}\n\n`;
    if (model.differentials.length > 0) {
      message += `✨ *Diferenciais:*\n`;
      model.differentials.forEach((d) => (message += `• ${d}\n`));
      message += `\n`;
    }
    if (model.included_items.length > 0) {
      message += `✅ *Itens Inclusos:*\n`;
      model.included_items.forEach((i) => (message += `• ${i}\n`));
      message += `\n`;
    }
    if (model.not_included_items.length > 0) {
      message += `❌ *Não Inclusos:*\n`;
      model.not_included_items.forEach((i) => (message += `• ${i}\n`));
      message += `\n`;
    }
    if (selectedOptionals.length > 0) {
      message += `➕ *Opcionais Selecionados:*\n`;
      selectedOptionals.forEach((opt) => (message += `• ${opt.name} - ${fmt(opt.price)}\n`));
      message += `\n`;
    }
    message += `💰 *VALOR DO INVESTIMENTO:*\nBase: ${fmt(model.base_price)}\n`;
    if (optionalsTotal > 0) message += `Opcionais: ${fmt(optionalsTotal)}\n`;
    message += `*TOTAL: ${fmt(totalPrice)}*\n\n`;
    message += `📅 *Prazos:*\nEntrega: ${model.delivery_days} dias\nInstalação: ${model.installation_days} dias\n\n`;
    message += `💳 *Forma de Pagamento:* ${model.payment_terms || "À vista"}\n`;
    message += `📆 *Data de Emissão:* ${today}\n⏰ *Validade:* ${validUntil} (3 dias)\n`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${customerData.whatsapp.replace(/\D/g, "")}?text=${encoded}`, "_blank");
  };

  const handlePrint = () => setTimeout(() => window.print(), 100);

  const handleSendEmail = () => {
    toast.success("✉️ Email enviado com sucesso! (modo teste)", {
      description: `Proposta enviada para: ${customerData.name}`,
      duration: 5000,
    });
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info("Gerando PDF...", { duration: 2000 });
      const element = document.getElementById("proposal-content");
      if (!element) return;

      await html2pdf()
        .set({
          margin: 0,
          filename: `proposta-${customerData.name.replace(/\s+/g, "-")}-${today.replace(/\//g, "-")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();

      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const storeLocation = [storeCity, storeState].filter(Boolean).join(" - ");

  // Auto-download PDF when coming from simulator
  useEffect(() => {
    if (autoDownload && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  return (
    <div className="min-h-screen bg-gradient-hero print:bg-white">
      {/* Action bar - hidden in print/PDF */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button variant="outline" onClick={handleSendEmail}>
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
            <Button
              onClick={generateWhatsAppMessage}
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: "white" }}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
          </div>
        </div>
      </nav>

      {/* PDF Content */}
      <main className="container mx-auto px-4 py-8 print:p-0">
        <div
          id="proposal-content"
          className="max-w-4xl mx-auto bg-white text-gray-900 print:shadow-none"
          style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
        >
          {/* ===== HEADER ===== */}
          <div
            className="px-8 py-6"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {storeSettings?.logo_url && (
                  <div className="bg-white rounded-lg p-2 shadow-md">
                    <img
                      src={storeSettings.logo_url}
                      alt="Logo"
                      className="h-14 w-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <div className="text-white">
                  <h2 className="text-2xl font-bold tracking-tight">{storeName || "Proposta Comercial"}</h2>
                  {storeLocation && <p className="text-white/80 text-sm mt-0.5">{storeLocation}</p>}
                </div>
              </div>
              <div className="text-right text-white text-sm space-y-0.5">
                <p className="font-semibold text-lg">PROPOSTA COMERCIAL</p>
                <p className="text-white/80">Emissão: {today}</p>
                <p className="text-white/80">Validade: {validUntil}</p>
              </div>
            </div>
          </div>

          {/* ===== BODY ===== */}
          <div className="px-8 py-6 space-y-6">
            {/* Cliente */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Dados do Cliente</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="font-semibold text-gray-700">Nome:</span> <span className="text-gray-900">{customerData.name}</span></div>
                <div><span className="font-semibold text-gray-700">Cidade:</span> <span className="text-gray-900">{customerData.city}</span></div>
                <div><span className="font-semibold text-gray-700">WhatsApp:</span> <span className="text-gray-900">{customerData.whatsapp}</span></div>
                <div><span className="font-semibold text-gray-700">Data:</span> <span className="text-gray-900">{today}</span></div>
              </div>
            </div>

            {/* Modelo */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Especificações do Produto</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="font-semibold text-gray-700">Categoria:</span> <span>{category}</span></div>
                <div><span className="font-semibold text-gray-700">Modelo:</span> <span className="font-semibold">{model.name}</span></div>
                {model.length && model.width && (
                  <div>
                    <span className="font-semibold text-gray-700">Dimensões:</span>{" "}
                    <span>{model.length}m × {model.width}m{model.depth ? ` × ${model.depth}m` : ""}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Diferenciais */}
            {model.differentials.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Diferenciais</h3>
                <div className="flex flex-wrap gap-2">
                  {model.differentials.map((d, i) => (
                    <span
                      key={i}
                      className="inline-block text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Itens inclusos / não inclusos */}
            <div className="grid grid-cols-2 gap-6">
              {model.included_items.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">✅ Itens Inclusos</h3>
                  <ul className="text-sm space-y-1.5">
                    {model.included_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {model.not_included_items.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">❌ Não Inclusos</h3>
                  <ul className="text-sm space-y-1.5 text-gray-500">
                    {model.not_included_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Opcionais */}
            {selectedOptionals.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Opcionais Selecionados</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {selectedOptionals.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center px-4 py-2.5 text-sm ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <span>{opt.name}</span>
                      <span className="font-semibold">{fmt(opt.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investimento */}
            <div
              className="rounded-lg p-5 mt-4"
              style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)` }}
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Investimento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Base ({model.name})</span>
                  <span className="font-semibold">{fmt(model.base_price)}</span>
                </div>
                {optionalsTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opcionais ({selectedOptionals.length} itens)</span>
                    <span className="font-semibold">{fmt(optionalsTotal)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 my-2" />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-lg font-bold text-gray-900">TOTAL</span>
                  <span
                    className="text-2xl font-extrabold"
                    style={{ color: primaryColor }}
                  >
                    {fmt(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Condições */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Prazos</h3>
                <div className="space-y-1.5">
                  <div><span className="font-semibold text-gray-700">Entrega:</span> {model.delivery_days} dias</div>
                  <div><span className="font-semibold text-gray-700">Instalação:</span> {model.installation_days} dias</div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Condições</h3>
                <div className="space-y-1.5">
                  <div><span className="font-semibold text-gray-700">Pagamento:</span> {model.payment_terms || "À vista"}</div>
                  <div><span className="font-semibold text-gray-700">Validade:</span> {validUntil} (3 dias)</div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div
            className="px-8 py-4 text-center text-xs"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: "white" }}
          >
            <p className="font-semibold">{storeName}</p>
            {storeLocation && <p className="opacity-80">{storeLocation}</p>}
            <p className="opacity-60 mt-1">Proposta gerada automaticamente • {today}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalView;

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, MessageCircle, Printer, Mail, ArrowLeft } from "lucide-react";
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

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const generateWhatsAppMessage = () => {
    let message = `🏊‍♂️ *PROPOSTA - PISCINA DE FIBRA*\n\n`;
    message += `📋 *Dados do Cliente:*\nNome: ${customerData.name}\nCidade: ${customerData.city}\n\n`;
    message += `🏊 *Categoria:* ${category}\n🎯 *Modelo:* ${model.name}\n\n`;
    if (model.included_items.length > 0) {
      message += `✅ *Itens Inclusos:*\n`;
      model.included_items.forEach((i) => (message += `• ${i}\n`));
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
    message += `💳 *Pagamento:* ${model.payment_terms || "À vista"}\n`;
    message += `📆 *Emissão:* ${today}\n⏰ *Validade:* ${validUntil}\n`;

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
          margin: 10,
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

  const storeLocation = [storeCity, storeState].filter(Boolean).join(" / ");

  useEffect(() => {
    if (autoDownload && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      const timer = setTimeout(() => handleDownloadPDF(), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  // Reusable section card style
  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginBottom: "16px",
    overflow: "hidden",
  };
  const sectionHeaderStyle: React.CSSProperties = {
    borderBottom: "1px solid #e5e7eb",
    borderLeft: `4px solid ${primaryColor}`,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: "14px",
    color: "#111827",
    background: "#f9fafb",
  };
  const sectionBodyStyle: React.CSSProperties = {
    padding: "16px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }} className="print:bg-white">
      {/* Action bar */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button variant="outline" onClick={handleSendEmail}>
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
            <Button
              onClick={generateWhatsAppMessage}
              style={{ background: primaryColor, color: "white" }}
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
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            background: "white",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: "#111827",
            padding: "32px",
          }}
          className="print:shadow-none"
        >
          {/* ===== HEADER ===== */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", borderBottom: "2px solid #e5e7eb", paddingBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {storeSettings?.logo_url ? (
                <img
                  src={storeSettings.logo_url}
                  alt="Logo"
                  style={{ height: "48px", width: "auto", objectFit: "contain" }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div style={{ fontSize: "20px", fontWeight: 800, color: primaryColor }}>
                  {storeName || "SIMULAPOOL"}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 }}>Proposta Comercial</h1>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>Emitida em {today}</p>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Validade: {validUntil}</p>
            </div>
          </div>

          {/* ===== CLIENTE ===== */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Cliente</div>
            <div style={sectionBodyStyle}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Nome", customerData.name],
                    ["WhatsApp", customerData.whatsapp],
                    ["Cidade / UF", customerData.city],
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ fontWeight: 700, color: "#374151", padding: "8px 16px 8px 0", width: "140px" }}>{label}</td>
                      <td style={{ padding: "8px 0", color: "#111827" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== PISCINA ===== */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Piscina</div>
            <div style={{ ...sectionBodyStyle, display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>{model.name}</span>
                  <span style={{
                    display: "inline-block",
                    background: `${primaryColor}18`,
                    color: primaryColor,
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>
                    {category}
                  </span>
                </div>
                {(model.length || model.width) && (
                  <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px" }}>
                    <strong>Dimensões:</strong> COMP: {model.length}M LARG: {model.width}M{model.depth ? ` PROF: ${model.depth}M` : ""}
                  </p>
                )}
                <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>
                  <strong>Valor base:</strong> {fmt(model.base_price)}
                </p>
              </div>
            </div>
          </div>

          {/* ===== ITENS INCLUSOS + OPCIONAIS ===== */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            {/* Itens Inclusos */}
            <div style={{ ...sectionStyle, flex: 1, marginBottom: 0 }}>
              <div style={sectionHeaderStyle}>Itens Inclusos</div>
              <div style={sectionBodyStyle}>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: "1.8" }}>
                  {model.included_items.map((item, i) => (
                    <li key={i} style={{ color: "#374151" }}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Opcionais */}
            <div style={{ ...sectionStyle, flex: 1, marginBottom: 0 }}>
              <div style={sectionHeaderStyle}>Opcionais</div>
              <div style={sectionBodyStyle}>
                {selectedOptionals.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>Nenhum opcional selecionado</p>
                ) : (
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <tbody>
                      {selectedOptionals.map((opt, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 8px 6px 0", color: "#374151" }}>{opt.name}</td>
                          <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{fmt(opt.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ===== RESUMO FINANCEIRO ===== */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Resumo Financeiro</div>
            <div style={sectionBodyStyle}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 0", color: "#6b7280" }}>Valor base</td>
                    <td style={{ padding: "8px 0", textAlign: "right", color: "#111827" }}>{fmt(model.base_price)}</td>
                  </tr>
                  {optionalsTotal > 0 && (
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 0", color: "#6b7280" }}>Opcionais</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: "#111827" }}>{fmt(optionalsTotal)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: "12px 0 8px", fontWeight: 800, fontSize: "16px", color: primaryColor }}>Total</td>
                    <td style={{ padding: "12px 0 8px", textAlign: "right", fontWeight: 800, fontSize: "16px", color: primaryColor }}>{fmt(totalPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== CONDIÇÕES ===== */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Condições</div>
            <div style={sectionBodyStyle}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Pagamento", model.payment_terms || "À vista"],
                    ["Entrega", `${model.delivery_days} dias`],
                    ["Instalação", `${model.installation_days} dias`],
                    ["Validade", `${validUntil} (3 dias)`],
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: i < 3 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ fontWeight: 700, color: "#374151", padding: "8px 16px 8px 0", width: "140px" }}>{label}</td>
                      <td style={{ padding: "8px 0", color: "#111827" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== DADOS DO LOJISTA ===== */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Dados do Lojista</div>
            <div style={sectionBodyStyle}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Empresa", storeName || "-"],
                    ["Cidade", storeLocation || "-"],
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: i < 1 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ fontWeight: 700, color: "#374151", padding: "8px 16px 8px 0", width: "140px" }}>{label}</td>
                      <td style={{ padding: "8px 0", color: "#111827" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div style={{ textAlign: "center", fontSize: "11px", color: "#9ca3af", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
            Documento gerado por SimulaPool
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalView;

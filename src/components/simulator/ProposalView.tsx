import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";


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

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  banner_1_url: string | null;
  banner_2_url: string | null;
  display_percent?: number;
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
  brandLogoUrl?: string | null;
  brandName?: string | null;
  brandPartnerId?: string | null;
  partners?: Partner[];
  includedItemsTotal?: number;
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
  brandLogoUrl,
  brandName,
  brandPartnerId,
  partners = [],
  includedItemsTotal = 0,
}: ProposalViewProps) => {
  const hasAutoDownloaded = useRef(false);
  const displayBasePrice = model.base_price + includedItemsTotal;
  const optionalsTotal = selectedOptionals.reduce((sum, opt) => sum + opt.price, 0);
  const totalPrice = displayBasePrice + optionalsTotal;
  const today = new Date().toLocaleDateString("pt-BR");
  const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");

  const primaryColor = storeSettings?.primary_color || "#0ea5e9";

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Banner logic: if brand has a partner_id, match by ID; fallback to name matching
  // For non-partner brands, use weighted random selection based on display_percent
  const matchedPartner = brandPartnerId
    ? partners.find(p => p.id === brandPartnerId)
    : brandName
      ? partners.find(p => p.name.toLowerCase().trim() === brandName.toLowerCase().trim())
      : null;

  const selectWeightedPartner = (): Partner | null => {
    const eligible = partners.filter(p => p.banner_1_url && (p.display_percent || 0) > 0);
    if (eligible.length === 0) return null;
    const totalWeight = eligible.reduce((sum, p) => sum + (p.display_percent || 0), 0);
    if (totalWeight <= 0) return eligible[0];
    const rand = Math.random() * totalWeight;
    let cumulative = 0;
    for (const p of eligible) {
      cumulative += (p.display_percent || 0);
      if (rand <= cumulative) return p;
    }
    return eligible[eligible.length - 1];
  };

  const bannersToShow = matchedPartner
    ? [matchedPartner]
    : (() => { const selected = selectWeightedPartner(); return selected ? [selected] : partners; })();
  const banner1Urls = bannersToShow.filter(p => p.banner_1_url).map(p => ({ url: p.banner_1_url!, name: p.name }));
  
  // Removed WhatsApp and email send functions - lead only gets PDF download and view

  const handleDownloadPDF = async () => {
    const element = document.getElementById("proposal-content");
    if (!element) return;

    const pageElements = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-page]"));
    if (pageElements.length === 0) return;

    const nameSlug = customerData.name.trim().replace(/\s+/g, "-");
    const filename = `Proposta-${nameSlug}-${today.replace(/\//g, "-")}.pdf`;
    const width = 800;

    const interactiveEls = element.querySelectorAll<HTMLElement>("button, [data-no-pdf], select");
    const hiddenOriginals: { el: HTMLElement; display: string }[] = [];
    const origWidth = element.style.width;
    const origMaxWidth = element.style.maxWidth;
    const origPadding = element.style.padding;

    try {
      toast.info("Gerando PDF...", { duration: 3000 });

      interactiveEls.forEach((el) => {
        hiddenOriginals.push({ el, display: el.style.display });
        el.style.display = "none";
      });

      element.style.width = `${width}px`;
      element.style.maxWidth = `${width}px`;
      element.style.padding = "32px";

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const margin = 10;
      const pageWidth = 210;
      const contentWidth = pageWidth - margin * 2;

      for (const [index, pageEl] of pageElements.entries()) {
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          width,
          windowWidth: width,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        if (index > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, imgHeight);
      }

      pdf.save(filename);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      element.style.width = origWidth;
      element.style.maxWidth = origMaxWidth;
      element.style.padding = origPadding;
      hiddenOriginals.forEach(({ el, display }) => {
        el.style.display = display;
      });
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
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Baixar</span> PDF
            </Button>
          </div>
        </div>
      </nav>

      {/* PDF Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 print:p-0">
        <div
          id="proposal-content"
          style={{
            maxWidth: "800px",
            width: "100%",
            margin: "0 auto",
            background: "white",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: "#111827",
            padding: "32px",
            boxSizing: "border-box",
          }}
        >
          <div data-pdf-page>
            {/* ===== HEADER ===== */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", borderBottom: "2px solid #e5e7eb", paddingBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {storeSettings?.logo_url ? (
                  <img
                    src={storeSettings.logo_url}
                    alt="Logo"
                    style={{ maxHeight: "72px", maxWidth: "200px", width: "auto", height: "auto", objectFit: "contain" }}
                    crossOrigin="anonymous"
                  />
                ) : null}
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                    {storeName || "SIMULAPOOL"}
                  </div>
                  {storeLocation && (
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                      {storeLocation}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 }}>Proposta Comercial</h1>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>Emitida em {today}</p>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Validade: {validUntil}</p>
              </div>
            </div>

            {/* ===== CLIENTE + BANNER LATERAL ===== */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <div style={{ ...sectionStyle, flex: 1, marginBottom: 0 }}>
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

              {/* Banner lateral (banner_1) */}
              {banner1Urls.length > 0 && (
                <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                  {banner1Urls.map((b, i) => (
                    <img
                      key={i}
                      src={b.url}
                      alt={`Banner ${b.name}`}
                      style={{ width: "100%", height: "auto", borderRadius: "8px", objectFit: "contain" }}
                      crossOrigin="anonymous"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ===== PISCINA ===== */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Piscina</div>
              <div style={{ ...sectionBodyStyle, display: "flex", alignItems: "flex-start", gap: "16px" }}>
                {brandLogoUrl && (
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "80px", height: "80px" }}>
                    <img src={brandLogoUrl} alt="Marca" style={{ maxWidth: "80px", maxHeight: "80px", objectFit: "contain" }} crossOrigin="anonymous" />
                  </div>
                )}
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
                    <strong>Valor base:</strong> {fmt(displayBasePrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* ===== ITENS INCLUSOS + OPCIONAIS ===== */}
            <div style={{ display: "flex", flexDirection: "row", gap: "16px", marginBottom: "16px" }}>
              <div style={{ ...sectionStyle, flex: 1, marginBottom: 0 }}>
                <div style={sectionHeaderStyle}>Itens Inclusos</div>
                <div style={sectionBodyStyle}>
                  {(() => {
                    const materiais = model.included_items.filter(item => !item.startsWith("[MO] "));
                    const maoDeObra = model.included_items.filter(item => item.startsWith("[MO] ")).map(item => item.replace("[MO] ", ""));
                    return (
                      <>
                        {materiais.length > 0 && (
                          <>
                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.5px" }}>Equipamentos e Produtos</p>
                            <ul style={{ margin: "0 0 8px", paddingLeft: "18px", fontSize: "12px", lineHeight: "1.8" }}>
                              {materiais.map((item, i) => (
                                <li key={`m-${i}`} style={{ color: "#374151" }}>{item}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {maoDeObra.length > 0 && (
                          <>
                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.5px" }}>Mão de Obra</p>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: "1.8" }}>
                              {maoDeObra.map((item, i) => (
                                <li key={`mo-${i}`} style={{ color: "#374151" }}>{item}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

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

            {/* ===== NÃO INCLUSOS ===== */}
            {model.not_included_items && model.not_included_items.length > 0 && (
              <div style={{ ...sectionStyle, marginBottom: "16px" }}>
                <div style={{ ...sectionHeaderStyle, borderLeft: `4px solid #ef4444` }}>Não Inclusos</div>
                <div style={sectionBodyStyle}>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: "1.8" }}>
                    {model.not_included_items.map((item, i) => (
                      <li key={i} style={{ color: "#6b7280" }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div data-pdf-page>
            {/* ===== RESUMO FINANCEIRO ===== */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Resumo Financeiro</div>
              <div style={sectionBodyStyle}>
                <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 0", color: "#6b7280" }}>Valor base</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: "#111827" }}>{fmt(displayBasePrice)}</td>
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


            {/* ===== PARCEIROS ===== */}
            {partners.length > 0 && (
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
                <p style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Parceiros oficiais
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "20px" }}>
                  {partners.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={p.name} style={{ maxHeight: "36px", maxWidth: "100px", objectFit: "contain" }} crossOrigin="anonymous" />
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280" }}>{p.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== FOOTER ===== */}
            <div style={{ textAlign: "center", fontSize: "11px", color: "#9ca3af", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
              Documento gerado por SimulaPool
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalView;

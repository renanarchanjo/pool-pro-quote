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

  // Banner logic
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

  const handleDownloadPDF = async () => {
    const element = document.getElementById("proposal-content");
    if (!element) return;

    const sections = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-section]"));
    if (sections.length === 0) return;

    const nameSlug = customerData.name.trim().replace(/\s+/g, "-");
    const filename = `Proposta-${nameSlug}-${today.replace(/\//g, "-")}.pdf`;
    const width = 800;

    const interactiveEls = element.querySelectorAll<HTMLElement>("button, [data-no-pdf], select");
    const hiddenOriginals: { el: HTMLElement; display: string }[] = [];
    let pdfOnlyOriginals: { el: HTMLElement; display: string }[] = [];
    const origWidth = element.style.width;
    const origMaxWidth = element.style.maxWidth;
    const origPadding = element.style.padding;

    // Temporarily reset transforms on all ancestors to prevent layout distortion
    const ancestorResets: { el: HTMLElement; transform: string; width: string; marginLeft: string; minHeight: string }[] = [];
    let ancestor = element.parentElement;
    while (ancestor) {
      const computed = getComputedStyle(ancestor);
      if (computed.transform !== "none") {
        ancestorResets.push({
          el: ancestor,
          transform: ancestor.style.transform,
          width: ancestor.style.width,
          marginLeft: ancestor.style.marginLeft,
          minHeight: ancestor.style.minHeight,
        });
        ancestor.style.transform = "none";
        ancestor.style.width = "100%";
        ancestor.style.marginLeft = "0";
        ancestor.style.minHeight = "auto";
      }
      ancestor = ancestor.parentElement;
    }

    try {
      toast.info("Gerando PDF...", { duration: 3000 });

      interactiveEls.forEach((el) => {
        hiddenOriginals.push({ el, display: el.style.display });
        el.style.display = "none";
      });

      const pdfOnlyEls = element.querySelectorAll<HTMLElement>("[data-pdf-only]");
      pdfOnlyEls.forEach((el) => {
        pdfOnlyOriginals.push({ el, display: el.style.display });
        el.style.display = "flex";
      });

      element.style.width = `${width}px`;
      element.style.maxWidth = `${width}px`;
      element.style.padding = "32px";

      // Force a reflow so html2canvas sees the correct layout
      element.getBoundingClientRect();

      // Wait for all images (including partner logos) to load
      const allImages = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        allImages.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );

      // Additional wait for mobile browsers to apply layout
      await new Promise(r => setTimeout(r, 300));

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const margin = 10;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - margin * 2;
      const sectionGap = 2;

      let currentY = margin;

      for (const section of sections) {
        // Force reflow per section on mobile
        section.getBoundingClientRect();
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          width,
          windowWidth: width,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY,
        });

        const imgHeightMm = (canvas.height * contentWidth) / canvas.width;

        if (currentY > margin && currentY + imgHeightMm > pageHeight - margin) {
          pdf.addPage("a4", "portrait");
          currentY = margin;
        }

        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, currentY, contentWidth, imgHeightMm);
        currentY += imgHeightMm + sectionGap;
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
      pdfOnlyOriginals.forEach(({ el, display }) => {
        el.style.display = display;
      });
      // Restore ancestor transforms
      ancestorResets.forEach(({ el, transform, width, marginLeft, minHeight }) => {
        el.style.transform = transform;
        el.style.width = width;
        el.style.marginLeft = marginLeft;
        el.style.minHeight = minHeight;
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

  // Separate included items
  const materiais = model.included_items.filter(item => !item.includes("[MO]"));
  const maoDeObra = model.included_items.filter(item => item.includes("[MO]")).map(item => item.replace("[MO] ", "").replace("[MO]", ""));

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }} className="print:bg-white">
      {/* Action bar */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 h-9 pl-4 pr-3 text-[13px] font-semibold text-white bg-[#2d2d2d] rounded-full transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95"
            >
              PDF
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dc2626]">
                <FileDown className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
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
            padding: "20px",
            boxSizing: "border-box",
          }}
          className="sm:!p-8"
        >
            {/* ===== HEADER ===== */}
            <div data-pdf-section style={{ marginBottom: "20px", borderBottom: "2px solid #e5e7eb", paddingBottom: "16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {storeSettings?.logo_url ? (
                    <img
                      src={storeSettings.logo_url}
                      alt="Logo"
                      style={{ maxHeight: "56px", maxWidth: "140px", width: "auto", height: "auto", objectFit: "contain" }}
                      crossOrigin="anonymous"
                    />
                  ) : null}
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                      {storeName || "SIMULAPOOL"}
                    </div>
                    {storeLocation && (
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                        {storeLocation}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>Proposta Comercial</h1>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "3px 0 0" }}>Emitida em {today} · Válida até {validUntil}</p>
                </div>
              </div>
            </div>

            {/* ===== CLIENTE ===== */}
            <div data-pdf-section style={sectionStyle}>
              <div style={sectionHeaderStyle}>Cliente</div>
              <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", fontSize: "13px" }}>
                  <div><span style={{ fontWeight: 700, color: "#374151" }}>Nome: </span><span style={{ color: "#111827" }}>{customerData.name}</span></div>
                  <div><span style={{ fontWeight: 700, color: "#374151" }}>WhatsApp: </span><span style={{ color: "#111827" }}>{customerData.whatsapp}</span></div>
                  <div><span style={{ fontWeight: 700, color: "#374151" }}>Cidade: </span><span style={{ color: "#111827" }}>{customerData.city}</span></div>
                </div>
              </div>
            </div>

            {/* ===== PISCINA ===== */}
            <div data-pdf-section style={sectionStyle}>
              <div style={sectionHeaderStyle}>Piscina</div>
              <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  {brandLogoUrl && (
                    <img src={brandLogoUrl} alt="Marca" style={{ width: "48px", height: "48px", objectFit: "contain", flexShrink: 0 }} crossOrigin="anonymous" />
                  )}
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{model.name}</span>
                      <span style={{
                        display: "inline-block",
                        background: `${primaryColor}18`,
                        color: primaryColor,
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>
                        {category}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#374151", display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                      {(model.length || model.width) && (
                        <span>
                          <strong>Dimensões:</strong> {model.length}m × {model.width}m{model.depth ? ` × ${model.depth}m` : ""}
                        </span>
                      )}
                      <span><strong>Valor base:</strong> {fmt(displayBasePrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== ITENS INCLUSOS + BANNER ===== */}
            {model.included_items.length > 0 && (
              <div data-pdf-section style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div style={{ ...sectionStyle, flex: 1, marginBottom: 0 }}>
                  <div style={sectionHeaderStyle}>Itens Inclusos</div>
                  <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                    {materiais.length > 0 && (
                      <div style={{ marginBottom: maoDeObra.length > 0 ? "10px" : 0 }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.5px" }}>Equipamentos e Produtos</p>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.7" }}>
                          {materiais.map((item, i) => (
                            <li key={`m-${i}`} style={{ color: "#374151" }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {maoDeObra.length > 0 && (
                      <div>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.5px" }}>Mão de Obra</p>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.7" }}>
                          {maoDeObra.map((item, i) => (
                            <li key={`mo-${i}`} style={{ color: "#374151" }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner parceiro ao lado dos itens inclusos */}
                {banner1Urls.length > 0 && (
                  <div className="hidden sm:flex" data-pdf-only style={{ width: "220px", flexShrink: 0, flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "8px" }}>
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
            )}

            {/* ===== OPCIONAIS ===== */}
            <div data-pdf-section style={sectionStyle}>
              <div style={sectionHeaderStyle}>Opcionais</div>
              <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                {selectedOptionals.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>Nenhum opcional selecionado</p>
                ) : (
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <tbody>
                      {selectedOptionals.map((opt, i) => (
                        <tr key={i} style={{ borderBottom: i < selectedOptionals.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "5px 8px 5px 0", color: "#374151" }}>{opt.name}</td>
                          <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{fmt(opt.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>


            {/* ===== NÃO INCLUSOS ===== */}
            {model.not_included_items && model.not_included_items.length > 0 && (
              <div data-pdf-section style={{ ...sectionStyle, marginBottom: "16px" }}>
                <div style={{ ...sectionHeaderStyle, borderLeft: `4px solid #ef4444` }}>Não Inclusos</div>
                <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.7", columns: 2 }} className="!columns-1 sm:!columns-2">
                    {model.not_included_items.map((item, i) => (
                      <li key={i} style={{ color: "#6b7280" }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ===== RESUMO FINANCEIRO ===== */}
            <div data-pdf-section style={sectionStyle}>
              <div style={sectionHeaderStyle}>Resumo Financeiro</div>
              <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 0", color: "#6b7280" }}>Valor base</td>
                      <td style={{ padding: "6px 0", textAlign: "right", color: "#111827" }}>{fmt(displayBasePrice)}</td>
                    </tr>
                    {optionalsTotal > 0 && (
                      <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "6px 0", color: "#6b7280" }}>Opcionais</td>
                        <td style={{ padding: "6px 0", textAlign: "right", color: "#111827" }}>{fmt(optionalsTotal)}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: "10px 0 6px", fontWeight: 800, fontSize: "16px", color: primaryColor }}>Total</td>
                      <td style={{ padding: "10px 0 6px", textAlign: "right", fontWeight: 800, fontSize: "16px", color: primaryColor }}>{fmt(totalPrice)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== CONDIÇÕES + LOJISTA ===== */}
            <div data-pdf-section style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
              <div style={{ ...sectionStyle, flex: "1 1 240px", marginBottom: 0 }}>
                <div style={sectionHeaderStyle}>Condições</div>
                <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                  <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {[
                      ["Pagamento", model.payment_terms || "À vista"],
                      ["Entrega", `${model.delivery_days} dias`],
                      ["Instalação", `${model.installation_days} dias`],
                    ].map(([label, value], i) => (
                      <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <span style={{ fontWeight: 700, color: "#374151", minWidth: "80px" }}>{label}</span>
                        <span style={{ color: "#111827" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ ...sectionStyle, flex: "1 1 240px", marginBottom: 0 }}>
                <div style={sectionHeaderStyle}>Dados do Lojista</div>
                <div style={{ ...sectionBodyStyle, padding: "12px 16px" }}>
                  <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "#374151", minWidth: "80px" }}>Empresa</span>
                      <span style={{ color: "#111827" }}>{storeName || "-"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "#374151", minWidth: "80px" }}>Cidade</span>
                      <span style={{ color: "#111827" }}>{storeLocation || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== PARCEIROS ===== */}
            {partners.length > 0 && (
              <div data-pdf-section style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                <p style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Parceiros oficiais
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "16px" }}>
                  {partners.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.logo_url ? (
                        <img
                          src={p.logo_url}
                          alt={p.name}
                          style={{ maxHeight: "32px", maxWidth: "80px", objectFit: "contain" }}
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const fallback = document.createElement("span");
                            fallback.textContent = p.name;
                            fallback.style.cssText = "font-size:11px;font-weight:700;color:#6b7280";
                            target.parentElement?.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280" }}>{p.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== FOOTER ===== */}
            <div data-pdf-section style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #e5e7eb" }}>
              Documento gerado por SimulaPool
            </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalView;

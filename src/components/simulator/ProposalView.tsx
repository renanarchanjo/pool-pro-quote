import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowLeft, Loader2, Check } from "lucide-react";
import { exportPDF, generatePDFBlob } from "@/lib/exportPDF";
import { savePdfToStorage } from "@/lib/savePdfToStorage";
import { toBase64Safe } from "@/lib/pdfImageUtils";
import { formatPhoneForWhatsApp } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import simulapoolLogoFooter from "@/assets/simulapool-logo-footer.png?inline";

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
  photo_url?: string | null;
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
  storeWhatsapp?: string | null;
  brandLogoUrl?: string | null;
  brandName?: string | null;
  brandPartnerId?: string | null;
  partners?: Partner[];
  includedItemsTotal?: number;
  proposalId?: string | null;
  hideWhatsApp?: boolean;
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
  storeWhatsapp,
  brandLogoUrl,
  brandName,
  brandPartnerId,
  partners = [],
  includedItemsTotal = 0,
  proposalId,
  hideWhatsApp = false,
}: ProposalViewProps) => {
  const hasAutoDownloaded = useRef(false);
  const pdfAssetsPromiseRef = useRef<Promise<void> | null>(null);
  const pdfAssetsCacheRef = useRef<Record<string, string>>({});
  const [pdfAssetMap, setPdfAssetMap] = useState<Record<string, string>>({});
  const [whatsAppState, setWhatsAppState] = useState<"idle" | "sending" | "sent">("idle");

  const displayBasePrice = model.base_price + includedItemsTotal;
  const optionalsTotal = selectedOptionals.reduce((sum, opt) => sum + opt.price, 0);
  const totalPrice = displayBasePrice + optionalsTotal;

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString("pt-BR");
  const validUntilDate = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const validUntil = validUntilDate.toLocaleDateString("pt-BR");

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Partner logic — preserved exactly as before
  const matchedPartner = brandPartnerId
    ? partners.find((p) => p.id === brandPartnerId)
    : brandName
      ? partners.find((p) => p.name.toLowerCase().trim() === brandName.toLowerCase().trim())
      : null;

  const selectWeightedPartner = (): Partner | null => {
    const eligible = partners.filter((p) => p.banner_1_url && (p.display_percent || 0) > 0);
    if (eligible.length === 0) return null;
    const totalWeight = eligible.reduce((sum, p) => sum + (p.display_percent || 0), 0);
    if (totalWeight <= 0) return eligible[0];
    const rand = Math.random() * totalWeight;
    let cumulative = 0;
    for (const p of eligible) {
      cumulative += p.display_percent || 0;
      if (rand <= cumulative) return p;
    }
    return eligible[eligible.length - 1];
  };

  const bannersToShow = matchedPartner
    ? [matchedPartner]
    : (() => {
        const selected = selectWeightedPartner();
        return selected ? [selected] : partners;
      })();

  const banner1Urls = bannersToShow
    .filter((p) => p.banner_1_url)
    .map((p) => ({ url: p.banner_1_url!, name: p.name }));

  const resolvePdfAssetSrc = (url?: string | null) => {
    if (!url) return null;
    return pdfAssetMap[url] || url;
  };

  const preparePdfAssets = async () => {
    const assetUrls = Array.from(
      new Set(
        [
          storeSettings?.logo_url,
          brandLogoUrl,
          simulapoolLogoFooter,
          model.photo_url,
          ...banner1Urls.map((banner) => banner.url),
          ...partners.map((partner) => partner.logo_url),
        ].filter((url): url is string => Boolean(url) && !url.startsWith("data:") && !url.startsWith("blob:")),
      ),
    );

    const missingUrls = assetUrls.filter((url) => !pdfAssetsCacheRef.current[url]);
    if (missingUrls.length === 0) return;
    if (pdfAssetsPromiseRef.current) return pdfAssetsPromiseRef.current;

    pdfAssetsPromiseRef.current = (async () => {
      const loadedAssets = await Promise.all(
        missingUrls.map(async (url) => [url, await toBase64Safe(url)] as const),
      );
      const nextAssets = Object.fromEntries(loadedAssets);
      pdfAssetsCacheRef.current = { ...pdfAssetsCacheRef.current, ...nextAssets };
      setPdfAssetMap((current) => ({ ...current, ...nextAssets }));
    })();

    try {
      await pdfAssetsPromiseRef.current;
    } finally {
      pdfAssetsPromiseRef.current = null;
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("proposal-content");
    if (!element) return;

    const filename = `Proposta-${customerData.name.trim().replace(/\s+/g, "-")}-${today.replace(/\//g, "-")}.pdf`;

    await preparePdfAssets();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await exportPDF({
      element,
      filename,
      orientation: "portrait",
      captureWidth: 794,
      sectionSelector: "[data-pdf-section]",
    });
  };

  const handleSendWhatsApp = async () => {
    if (!proposalId || whatsAppState !== "idle") return;

    const element = document.getElementById("proposal-content");
    if (!element) return;

    setWhatsAppState("sending");
    try {
      await preparePdfAssets();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pdfBlob = await generatePDFBlob({
        element,
        orientation: "portrait",
        captureWidth: 794,
        sectionSelector: "[data-pdf-section]",
      });

      const publicUrl = await savePdfToStorage(proposalId, pdfBlob);

      const result = await supabase.functions.invoke("send-whatsapp", {
        body: {
          type: "enviar_proposta",
          data: {
            customerPhone: formatPhoneForWhatsApp(customerData.whatsapp),
            customerName: customerData.name,
            storeName: storeName || "SimulaPool",
            pdfUrl: publicUrl,
          },
        },
      });

      if (result.error) throw new Error(result.error.message || "Erro na Edge Function");

      setWhatsAppState("sent");
      toast.success("Proposta enviada para seu WhatsApp!");
      setTimeout(() => setWhatsAppState("idle"), 3000);
    } catch (err) {
      console.error("Erro ao enviar WhatsApp:", err);
      toast.error("Erro ao enviar proposta. Tente novamente.");
      setWhatsAppState("idle");
    }
  };

  const storeLocation = [storeCity, storeState].filter(Boolean).join(" / ");

  useEffect(() => {
    void preparePdfAssets();
  }, [storeSettings?.logo_url, brandLogoUrl, partners, brandPartnerId, model.photo_url]);

  useEffect(() => {
    if (autoDownload && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      const timer = setTimeout(() => handleDownloadPDF(), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  // Split included items
  const materiais = model.included_items.filter((item) => !item.includes("[MO]"));
  const maoDeObra = model.included_items
    .filter((item) => item.includes("[MO]"))
    .map((item) => item.replace("[MO] ", "").replace("[MO]", ""));

  const dimensions = [
    model.length ? `${model.length}m` : null,
    model.width ? `${model.width}m` : null,
    model.depth ? `${model.depth}m` : null,
  ].filter(Boolean).join(" × ");

  // ── STYLES ──
  const PAGE_PADDING = "32px";
  const FONT = "'Inter', sans-serif";
  const TEXT_COLOR = "#374151";
  const LABEL: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: 0,
  };
  const THIN_LINE: React.CSSProperties = {
    borderBottom: "1px solid #E5E7EB",
    marginBottom: "12px",
    paddingBottom: "4px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }} className="print:bg-white">
      {/* ── NAV BAR (screen only) ── */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 h-9 sm:h-[48px] pl-4 pr-3 text-[13px] sm:text-[15px] font-semibold text-white bg-[#2d2d2d] rounded-full sm:rounded-[10px] transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95"
            >
              📥 PDF
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dc2626]">
                <FileDown className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
            {proposalId && !hideWhatsApp && (
              <button
                onClick={handleSendWhatsApp}
                disabled={whatsAppState !== "idle"}
                className="inline-flex items-center gap-2 h-9 sm:h-[48px] px-4 sm:px-5 text-[13px] sm:text-[15px] font-semibold text-white rounded-full sm:rounded-[10px] transition-all duration-150 active:scale-95 disabled:opacity-70"
                style={{ backgroundColor: whatsAppState === "sent" ? "#16a34a" : "#25D366" }}
                onMouseEnter={(e) => { if (whatsAppState === "idle") e.currentTarget.style.backgroundColor = "#128C7E"; }}
                onMouseLeave={(e) => { if (whatsAppState === "idle") e.currentTarget.style.backgroundColor = "#25D366"; }}
              >
                {whatsAppState === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
                {whatsAppState === "sent" && <Check className="w-4 h-4" />}
                {whatsAppState === "idle" && "📱"}
                {whatsAppState === "idle" && " Receber no WhatsApp"}
                {whatsAppState === "sending" && " Enviando..."}
                {whatsAppState === "sent" && " Enviado!"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── PDF CONTENT ── */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 print:p-0">
        <div
          id="proposal-content"
          style={{
            maxWidth: "794px",
            width: "100%",
            margin: "0 auto",
            background: "white",
            fontFamily: FONT,
            color: TEXT_COLOR,
            lineHeight: 1.5,
            boxSizing: "border-box",
          }}
        >
          {/* ════════════════════════════════════════════
              PÁGINA 1
              ════════════════════════════════════════════ */}

          {/* ── HEADER ── */}
          <div data-pdf-section style={{ padding: `${PAGE_PADDING} ${PAGE_PADDING} 0` }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingBottom: "14px",
              borderBottom: "2px solid #0EA5E9",
            }}>
              {/* Left: Logo + Store info */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {storeSettings?.logo_url && (
                  <img
                    src={resolvePdfAssetSrc(storeSettings.logo_url) || undefined}
                    alt="Logo"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    style={{ height: "48px", width: "auto", objectFit: "contain" }}
                    crossOrigin="anonymous"
                  />
                )}
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                    {storeName || "SIMULAPOOL"}
                  </div>
                  {storeLocation && (
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                      {storeLocation}
                    </div>
                  )}
                </div>
              </div>
              {/* Right: Proposal info */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
                  Proposta Comercial
                </div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>
                  Emitida em {today}
                </div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "1px" }}>
                  Válida até {validUntil}
                </div>
              </div>
            </div>
          </div>

          {/* ── BANNER DA PISCINA 3:2 ── */}
          {model.photo_url && (
            <div data-pdf-section style={{ padding: `16px ${PAGE_PADDING} 0` }}>
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "3 / 2",
                overflow: "hidden",
                background: "#1E293B",
              }}>
                <img
                  src={resolvePdfAssetSrc(model.photo_url) || undefined}
                  alt={model.name}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {/* Gradient overlay */}
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "50%",
                  background: "linear-gradient(transparent 0%, rgba(15,23,42,0.85) 100%)",
                }} />
                {/* Text over overlay */}
                <div style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  right: "16px",
                }}>
                  {brandLogoUrl && (
                    <div style={{
                      display: "inline-block",
                      background: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}>
                      <img
                        src={resolvePdfAssetSrc(brandLogoUrl) || undefined}
                        alt={brandName || "Marca"}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        style={{ height: "32px", width: "auto", objectFit: "contain", display: "block" }}
                      />
                    </div>
                  )}
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "white", margin: 0 }}>
                    {model.name}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#38BDF8",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginTop: "2px",
                  }}>
                    {category}
                  </div>
                  {dimensions && (
                    <div style={{ fontSize: "13px", color: "white", opacity: 0.85, marginTop: "4px" }}>
                      {dimensions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── DADOS DO CLIENTE ── */}
          <div data-pdf-section style={{ padding: `20px ${PAGE_PADDING} 0` }}>
            <p style={{ ...LABEL, ...THIN_LINE }}>CLIENTE</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Nome completo</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{customerData.name}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#9CA3AF" }}>WhatsApp</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{customerData.whatsapp}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Cidade / Estado</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{customerData.city}</div>
              </div>
            </div>
          </div>

          {/* ── ITENS INCLUSOS ── */}
          {model.included_items.length > 0 && (
            <div data-pdf-section style={{ padding: `20px ${PAGE_PADDING} 0` }}>
              <p style={{ ...LABEL, ...THIN_LINE }}>ITENS INCLUSOS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {materiais.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", marginBottom: "6px" }}>
                      EQUIPAMENTOS E PRODUTOS
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "14px", listStyleType: "disc" }}>
                      {materiais.map((item, i) => (
                        <li key={`m-${i}`} style={{ fontSize: "12px", color: "#374151", lineHeight: 1.7, listStyleType: "none", position: "relative", paddingLeft: "12px" }}>
                          <span style={{ position: "absolute", left: 0, color: "#0EA5E9", fontWeight: 700 }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {maoDeObra.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", marginBottom: "6px" }}>
                      MÃO DE OBRA
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "14px" }}>
                      {maoDeObra.map((item, i) => (
                        <li key={`mo-${i}`} style={{ fontSize: "12px", color: "#374151", lineHeight: 1.7, listStyleType: "none", position: "relative", paddingLeft: "12px" }}>
                          <span style={{ position: "absolute", left: 0, color: "#0EA5E9", fontWeight: 700 }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── OPCIONAIS ── */}
          {selectedOptionals.length > 0 && (
            <div data-pdf-section style={{ padding: `20px ${PAGE_PADDING} 0` }}>
              <p style={{ ...LABEL, ...THIN_LINE }}>OPCIONAIS SELECIONADOS</p>
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                <tbody>
                  {selectedOptionals.map((opt, i) => (
                    <tr key={i} style={{ borderBottom: i < selectedOptionals.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                      <td style={{ padding: "6px 0", color: "#374151" }}>{opt.name}</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                        {fmt(opt.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── NÃO INCLUSOS ── */}
          {model.not_included_items && model.not_included_items.length > 0 && (
            <div data-pdf-section style={{ padding: `20px ${PAGE_PADDING} 0` }}>
              <p style={{ ...LABEL, ...THIN_LINE }}>NÃO INCLUSOS</p>
              <div style={{
                borderLeft: "3px solid #FCA5A5",
                background: "#FFF5F5",
                padding: "12px 16px",
                borderRadius: "0 4px 4px 0",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                  {model.not_included_items.map((item, i) => (
                    <div key={i} style={{ fontSize: "11px", color: "#6B7280" }}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              PÁGINA 2
              ════════════════════════════════════════════ */}

          {/* ── RESUMO FINANCEIRO ── */}
          <div data-pdf-section style={{ padding: `24px ${PAGE_PADDING} 0` }}>
            <div style={{
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "16px 20px",
            }}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#6B7280" }}>Valor base piscina</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#0F172A" }}>{fmt(displayBasePrice)}</td>
                  </tr>
                  {optionalsTotal > 0 && (
                    <tr>
                      <td style={{ padding: "6px 0", color: "#6B7280" }}>Opcionais</td>
                      <td style={{ padding: "6px 0", textAlign: "right", color: "#0F172A" }}>{fmt(optionalsTotal)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={2} style={{ padding: 0 }}>
                      <div style={{ borderBottom: "1px solid #E5E7EB", margin: "6px 0" }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", fontWeight: 700, fontSize: "20px", color: "#0EA5E9" }}>TOTAL</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, fontSize: "20px", color: "#0EA5E9" }}>
                      {fmt(totalPrice)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CONDIÇÕES ── */}
          <div data-pdf-section style={{ padding: `20px ${PAGE_PADDING} 0` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Condições Comerciais */}
              <div>
                <p style={{ ...LABEL, marginBottom: "8px" }}>CONDIÇÕES COMERCIAIS</p>
                <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    ["Pagamento", model.payment_terms || "À vista"],
                    ["Entrega", `${model.delivery_days} dias`],
                    ["Instalação", `${model.installation_days} dias`],
                  ].map(([label, value], i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "#374151", minWidth: "90px" }}>{label}:</span>
                      <span style={{ color: "#0F172A" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Dados da Loja */}
              <div>
                <p style={{ ...LABEL, marginBottom: "8px" }}>DADOS DA LOJA</p>
                <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontWeight: 700, color: "#374151", minWidth: "90px" }}>Empresa:</span>
                    <span style={{ color: "#0F172A" }}>{storeName || "-"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontWeight: 700, color: "#374151", minWidth: "90px" }}>Cidade:</span>
                    <span style={{ color: "#0F172A" }}>{storeLocation || "-"}</span>
                  </div>
                  {storeWhatsapp && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "#374151", minWidth: "90px" }}>WhatsApp:</span>
                      <span style={{ color: "#0F172A" }}>{storeWhatsapp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── DIFERENCIAIS ── */}
          {model.differentials && model.differentials.length > 0 && (
            <div data-pdf-section style={{ padding: `20px ${PAGE_PADDING} 0` }}>
              <p style={{ ...LABEL, ...THIN_LINE }}>DIFERENCIAIS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                {model.differentials.map((diff, i) => (
                  <div key={i} style={{ fontSize: "12px", color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#10B981", fontWeight: 700, fontSize: "14px" }}>✓</span>
                    {diff}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PARCEIROS OFICIAIS ── */}
          {partners.length > 0 && (
            <div data-pdf-section style={{ padding: `24px ${PAGE_PADDING} 0` }}>
              <div style={{ borderTop: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB", padding: "12px 0" }}>
                <p style={{
                  ...LABEL,
                  textAlign: "center",
                  marginBottom: "12px",
                }}>
                  PARCEIROS OFICIAIS
                </p>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px 24px",
                }}>
                  {partners.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.logo_url ? (
                        <img
                          src={resolvePdfAssetSrc(p.logo_url) || undefined}
                          alt={p.name}
                          loading="eager"
                          referrerPolicy="no-referrer"
                          style={{ height: "32px", width: "auto", objectFit: "contain", margin: "0 12px" }}
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const fallback = document.createElement("span");
                            fallback.textContent = p.name;
                            fallback.style.cssText = "font-size:11px;font-weight:600;color:#6B7280";
                            target.parentElement?.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280" }}>{p.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RODAPÉ ── */}
          <div data-pdf-section style={{ padding: `12px ${PAGE_PADDING} ${PAGE_PADDING}` }}>
            <div style={{
              borderTop: "1px solid #E5E7EB",
              paddingTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img
                  src={resolvePdfAssetSrc(simulapoolLogoFooter) || simulapoolLogoFooter}
                  alt="SimulaPool"
                  style={{ height: "20px", width: "auto", objectFit: "contain" }}
                />
                <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Documento gerado por SimulaPool</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "10px", color: "#0EA5E9" }}>simulapool.com</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Import Inter font for PDF rendering */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  );
};

export default ProposalView;

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Check, Download, MessageCircle } from "lucide-react";
import { exportPDF, generatePDFBlob } from "@/lib/exportPDF";
import { PDF_IMAGE_FALLBACK, toBase64Safe } from "@/lib/pdfImageUtils";
import { formatPhoneForWhatsApp } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";
import { toast } from "sonner";
import simulapoolLogoFooter from "@/assets/simulapool-logo-footer.png?inline";
import ProposalPdfTemplate from "./ProposalPdfTemplate";
import type { PdfTemplatePartner } from "./ProposalPdfTemplate";

interface PoolModel {
  id?: string;
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
  /** Authoritative total saved in the DB. When set, the PDF/preview shows this value
   *  instead of recomputing base+inclusos+opcionais (which can drift). */
  overrideTotalPrice?: number | null;
  proposalId?: string | null;
  storeId?: string | null;
  hideWhatsApp?: boolean;
  hideDownloadPdf?: boolean;
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
  overrideTotalPrice = null,
  proposalId,
  storeId,
  hideWhatsApp = false,
  hideDownloadPdf = false,
}: ProposalViewProps) => {
  const hasAutoDownloaded = useRef(false);
  const pdfAssetsPromiseRef = useRef<Promise<void> | null>(null);
  const pdfAssetsCacheRef = useRef<Record<string, string>>({});
  const [pdfAssetMap, setPdfAssetMap] = useState<Record<string, string>>({});
  const [whatsAppState, setWhatsAppState] = useState<"idle" | "sending" | "sent">("idle");
  const [whatsappStatus, setWhatsappStatus] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [liveIncludedItems, setLiveIncludedItems] = useState<{ items: string[]; total: number } | null>(null);
  const isMobile = useIsMobile();
  const [mobileScale, setMobileScale] = useState(1);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!model.id) {
      setLiveIncludedItems(null);
      return;
    }

    let cancelled = false;

    const loadCurrentIncludedItems = async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_model_included_items_public", { _model_id: model.id });

      if (cancelled) return;

      if (error) {
        setLiveIncludedItems(null);
        return;
      }

      const rows = data || [];
      setLiveIncludedItems({
        items: rows.map((item) => {
          const qty = Number(item.quantity) || 1;
          const prefix = item.item_type === "mao_de_obra" ? "[MO] " : "";
          return qty > 1 ? `${qty}x ${prefix}${item.name}` : `${prefix}${item.name}`;
        }),
        total: rows.reduce((sum, item) => sum + Number(item.price || 0), 0),
      });
    };

    void loadCurrentIncludedItems();

    return () => {
      cancelled = true;
    };
  }, [model.id]);

  const modelForDisplay = useMemo(
    () => liveIncludedItems ? { ...model, included_items: liveIncludedItems.items } : model,
    [liveIncludedItems, model]
  );

  const displayedIncludedItemsTotal = liveIncludedItems?.total ?? includedItemsTotal;

  useEffect(() => {
    if (!isMobile) { setMobileScale(1); return; }
    const update = () => {
      const vw = window.innerWidth;
      setMobileScale(Math.min(vw / 794, 1));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isMobile]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const today = new Date().toLocaleDateString("pt-BR");

  // ── Stable partner URL key ──
  const partnerUrls = useMemo(
    () => partners.map(p => [p.logo_url, p.banner_1_url].filter(Boolean)).flat().join(","),
    [partners]
  );

  // ── Partner selection (stable via useMemo) ──
  const matchedPartner = brandPartnerId
    ? partners.find((p) => p.id === brandPartnerId)
    : brandName
      ? partners.find((p) => p.name.toLowerCase().trim() === brandName.toLowerCase().trim())
      : null;

  const bannersToShow = useMemo(() => {
    if (matchedPartner?.banner_1_url) {
      return [{ url: matchedPartner.banner_1_url, name: matchedPartner.name }];
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedPartner?.id, partnerUrls]);

  const resolveSrc = (url?: string | null) => {
    if (!url) return null;
    return pdfAssetMap[url] || url;
  };

  // ── Asset preparation ──
  const preparePdfAssets = async () => {
    const assetUrls = Array.from(
      new Set(
        [
          storeSettings?.logo_url,
          brandLogoUrl,
          simulapoolLogoFooter,
          modelForDisplay.photo_url,
          ...bannersToShow.map((b) => b.url),
          ...partners.map((p) => p.logo_url),
        ].filter((u): u is string => Boolean(u) && !u.startsWith("data:") && !u.startsWith("blob:")),
      ),
    );

    const missingUrls = assetUrls.filter((u) => !pdfAssetsCacheRef.current[u]);
    if (missingUrls.length === 0) return;
    if (pdfAssetsPromiseRef.current) return pdfAssetsPromiseRef.current;

    const loadAssetWithRetry = async (url: string): Promise<[string, string]> => {
      let base64 = PDF_IMAGE_FALLBACK;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        base64 = await toBase64Safe(url);
        if (base64 !== PDF_IMAGE_FALLBACK) break;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      return [url, base64];
    };

    pdfAssetsPromiseRef.current = (async () => {
      const CONCURRENCY = 4;
      const allResults: [string, string][] = [];
      for (let i = 0; i < missingUrls.length; i += CONCURRENCY) {
        const batch = missingUrls.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(batch.map((url) => loadAssetWithRetry(url)));
        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value[1] !== PDF_IMAGE_FALLBACK) {
            allResults.push([r.value[0], r.value[1]]);
          }
        });
      }
      const nextAssets = Object.fromEntries(allResults);
      pdfAssetsCacheRef.current = { ...pdfAssetsCacheRef.current, ...nextAssets };
      setPdfAssetMap((c) => ({ ...c, ...nextAssets }));
    })();

    try {
      await pdfAssetsPromiseRef.current;
    } finally {
      pdfAssetsPromiseRef.current = null;
    }
  };

  const waitForPdfCaptureReady = async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // Reduced wait — images are already preloaded by preparePdfAssets
    await new Promise((r) => setTimeout(r, 800));
  };

  // ── PDF actions ──
  const handleDownloadPDF = async () => {
    if (isGeneratingPdf) return;
    const element = document.getElementById("proposal-content");
    console.log("[PDF] Elemento encontrado:", !!element);
    if (!element) return;

    const imgsBefore = element.querySelectorAll("img");
    console.log("[PDF] Imagens no elemento ANTES do prepareAssets:", imgsBefore.length);
    imgsBefore.forEach((img, i) => {
      const srcPreview = img.src.startsWith("data:") ? `base64 ✅ (${img.src.length} chars, hash:${img.src.substring(30, 50)})` : `URL ❌ ${img.src.substring(0, 100)}`;
      console.log(`[PDF] img[${i}] src:`, srcPreview);
    });
    // Log asset map keys for debugging cache
    console.log("[PDF] pdfAssetMap keys:", Object.keys(pdfAssetMap));
    console.log("[PDF] storeSettings.logo_url:", storeSettings?.logo_url);
    console.log("[PDF] brandLogoUrl:", brandLogoUrl);
    console.log("[PDF] São iguais?", storeSettings?.logo_url === brandLogoUrl);

    setIsGeneratingPdf(true);
    try {
      const filename = `Proposta-${customerData.name.trim().replace(/\s+/g, "-")}-${today.replace(/\//g, "-")}.pdf`;
      await preparePdfAssets();
      await waitForPdfCaptureReady();

      const imgsAfter = element.querySelectorAll("img");
      console.log("[PDF] Imagens no elemento APÓS prepareAssets:", imgsAfter.length);
      imgsAfter.forEach((img, i) => {
        console.log(`[PDF] img[${i}] após:`, img.src.startsWith("data:") ? "base64 ✅" : "URL ❌", img.src.substring(0, 80));
        console.log(`[PDF] img[${i}] naturalWidth:`, img.naturalWidth, "naturalHeight:", img.naturalHeight, "complete:", img.complete);
      });

      // Check data-pdf-page sections
      const sections = element.querySelectorAll("[data-pdf-page]");
      console.log("[PDF] Seções data-pdf-page:", sections.length);
      sections.forEach((s, i) => {
        const el = s as HTMLElement;
        console.log(`[PDF] seção[${i}] offsetW:`, el.offsetWidth, "offsetH:", el.offsetHeight, "scrollH:", el.scrollHeight);
      });

      await exportPDF({
        element,
        filename,
        orientation: "portrait",
        sectionSelector: "[data-pdf-page]",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    console.log("[WPP] 1. handleSendWhatsApp iniciado");
    console.log("[WPP] 1. userAgent:", navigator.userAgent);
    console.log("[WPP] 1. proposalId:", proposalId);
    console.log("[WPP] 1. customerPhone:", customerData.whatsapp);
    console.log("[WPP] 1. storeWhatsapp:", storeWhatsapp);

    if (!proposalId || !storeId || whatsAppState !== "idle" || isGeneratingPdf) return;
    const element = document.getElementById("proposal-content");
    if (!element) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    setWhatsAppState("sending");
    setIsGeneratingPdf(true);
    setUploadProgress(0);
    setWhatsappStatus("Preparando proposta...");

    await new Promise((r) => requestAnimationFrame(r));

    let attempts = 0;
    const maxAttempts = 2; // Retry on both mobile and desktop

    while (attempts < maxAttempts) {
      attempts++;
      try {
        setWhatsappStatus("Gerando PDF...");
        await preparePdfAssets();
        await waitForPdfCaptureReady();

        console.log("[WPP] 2. preparePdfAssets concluído");
        console.log("[WPP] 2. elemento proposal-content existe:", !!document.getElementById("proposal-content"));
        console.log("[WPP] 2. largura do elemento:", document.getElementById("proposal-content")?.offsetWidth);

        console.log("[WPP] 3. Iniciando generatePDFBlob");
        const pdfBlob = await generatePDFBlob({
          element,
          orientation: "portrait",
          sectionSelector: "[data-pdf-page]",
        });
        console.log("[WPP] 3. Blob gerado:", pdfBlob?.size, "bytes", pdfBlob?.type);
        if (!pdfBlob || pdfBlob.size === 0) {
          console.error("[WPP] 3. ERRO: blob inválido");
          throw new Error("PDF gerado está vazio");
        }

        setWhatsappStatus("Enviando para WhatsApp...");
        setUploadProgress(40);

        const formData = new FormData();
        formData.append("pdf", new File([pdfBlob], `proposta-${proposalId}.pdf`, { type: "application/pdf" }));
        formData.append("storeId", storeId);
        formData.append("proposalId", proposalId);
        formData.append("customerPhone", formatPhoneForWhatsApp(customerData.whatsapp));
        formData.append("customerName", customerData.name);
        formData.append("storeName", storeName || "SimulaPool");

        console.log("[WPP] 4. Enviando PDF para send-proposal-whatsapp");
        const result = await supabase.functions.invoke("send-proposal-whatsapp", {
          body: formData,
        });
        setUploadProgress(100);
        console.log("[WPP] 4. URL do PDF:", result.data?.pdfUrl);
        console.log("[WPP] 5. Resposta da Edge Function:", JSON.stringify(result.data));
        if (result.error) {
          console.error("[WPP] 5. ERRO na Edge Function:", result.error);
          throw new Error(result.error.message || "Erro na Edge Function");
        }

        if (result.data && !result.data.success) {
          console.error("[WPP] 5. ERRO na Edge Function:", JSON.stringify(result.data));
          throw new Error(result.data.error || "Falha ao enviar proposta por WhatsApp");
        }
        // Check if Z-API returned an error inside the data
        if (result.data && !result.data.success) {
          console.error("[WPP] 5. Z-API retornou erro:", JSON.stringify(result.data));
          throw new Error("Z-API falhou ao enviar mensagem");
        }

        setWhatsappStatus("✓ Enviado!");
        setWhatsAppState("sent");
        toast.success("Proposta enviada para seu WhatsApp!");
        setTimeout(() => {
          setWhatsAppState("idle");
          setWhatsappStatus(null);
        }, 3000);
        return; // success — exit
      } catch (err) {
        console.error(`[WPP] Erro (tentativa ${attempts}/${maxAttempts}):`, err);
        Sentry.captureException(err, {
          tags: { feature: "whatsapp_send" },
          extra: { proposalId, storeId, attempt: attempts, isMobile },
        });

        if (attempts < maxAttempts) {
          const delay = attempts * 1500;
          setWhatsappStatus(`Tentando novamente em ${delay / 1000}s...`);
          setUploadProgress(0);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // All retries exhausted — fallback
        if (isMobile) {
          console.warn("[WPP] Fallback mobile: abrindo WhatsApp com link");
          const proposalUrl = `${window.location.origin}/proposta/${proposalId}`;
          const phone = formatPhoneForWhatsApp(customerData.whatsapp);
          const fallbackMessage = `Olá ${customerData.name}! Segue o link da sua proposta:\n${proposalUrl}`;
          window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(fallbackMessage)}`,
            "_blank"
          );
          toast.info("Abrindo WhatsApp com link da proposta.");
        } else {
          const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
          toast.error(`Falha ao enviar: ${errMsg}. Tente novamente.`);
        }

        setWhatsAppState("idle");
        setWhatsappStatus(null);
      }
    }

    setIsGeneratingPdf(false);
    setUploadProgress(0);
  };

  useEffect(() => {
    void preparePdfAssets();
  }, [storeSettings?.logo_url, brandLogoUrl, partnerUrls, brandPartnerId, modelForDisplay.photo_url]);

  useEffect(() => {
    if (autoDownload && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      const timer = setTimeout(() => handleDownloadPDF(), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }} className="print:bg-white">
      {/* ── NAV BAR (screen only) ── */}
      <nav className="border-b border-sp-border bg-white/86 backdrop-blur-xl sticky top-0 z-50 print:hidden">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center flex-wrap gap-3">
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-primary">
              Etapa 4 de 4 · Proposta gerada
            </span>
            <h1
              className="sp-display font-bold tracking-tight text-sp-fg truncate"
              style={{ fontSize: "clamp(18px, 3vw, 26px)" }}
            >
              Olá, {customerData.name.split(" ")[0]}! Sua proposta está pronta.
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onBack} className="sp-btn sp-btn-ghost sp-btn-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Nova simulação</span>
            </button>

            {!hideDownloadPdf && (
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="sp-btn sp-btn-dark"
              >
                {isGeneratingPdf ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</>
                ) : (
                  <><Download className="w-4 h-4" /> Baixar PDF</>
                )}
              </button>
            )}

            {proposalId && !hideWhatsApp && (
              <button
                onClick={handleSendWhatsApp}
                disabled={whatsAppState !== "idle" || isGeneratingPdf}
                className="sp-btn sp-btn-lg text-white"
                style={{
                  background: whatsAppState === "sent" ? "#16a34a" : "#25D366",
                  boxShadow:
                    whatsAppState === "sent"
                      ? "0 8px 20px rgba(22,163,74,0.25)"
                      : "0 8px 20px rgba(37,211,102,0.25)",
                }}
              >
                {whatsAppState === "sending" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                ) : whatsAppState === "sent" ? (
                  <><Check className="w-4 h-4" /> Enviado!</>
                ) : (
                  <><MessageCircle className="w-4 h-4" /> Receber no WhatsApp</>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── PREVIEW = PDF (responsive on mobile, fixed 794px template) ── */}
      <main ref={mainRef} className="print:p-0" style={{ overflowX: "hidden", padding: isMobile ? "8px 0 0" : "16px 0" }}>
        <div
          style={{
            width: "794px",
            transformOrigin: "top left",
            transform: mobileScale < 1 ? `scale(${mobileScale})` : undefined,
            margin: mobileScale < 1 ? "0" : "0 auto",
          }}
        >
          <ProposalPdfTemplate
            model={modelForDisplay}
            selectedOptionals={selectedOptionals}
            customerData={customerData}
            category={category}
            storeSettings={storeSettings}
            storeName={storeName}
            storeCity={storeCity}
            storeState={storeState}
            storeWhatsapp={storeWhatsapp}
            brandLogoUrl={brandLogoUrl}
            brandName={brandName}
            includedItemsTotal={displayedIncludedItemsTotal}
            overrideTotalPrice={overrideTotalPrice}
            partners={partners}
            bannersToShow={bannersToShow}
            resolveSrc={resolveSrc}
          />
        </div>
      </main>
    </div>
  );
};

export default ProposalView;

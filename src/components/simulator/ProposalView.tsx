import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowLeft, Loader2, Check } from "lucide-react";
import { exportPDF, generatePDFBlob } from "@/lib/exportPDF";
import { savePdfToStorage } from "@/lib/savePdfToStorage";
import { PDF_IMAGE_FALLBACK, toBase64Safe } from "@/lib/pdfImageUtils";
import { formatPhoneForWhatsApp } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import simulapoolLogoFooter from "@/assets/simulapool-logo-footer.png?inline";
import ProposalPdfTemplate from "./ProposalPdfTemplate";
import type { PdfTemplatePartner } from "./ProposalPdfTemplate";

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
  proposalId,
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
  const [uploadProgress, setUploadProgress] = useState(0);

  const today = new Date().toLocaleDateString("pt-BR");

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
    const eligible = partners.filter((p) => p.banner_1_url && (p.display_percent || 0) > 0);
    if (eligible.length > 0) {
      const totalWeight = eligible.reduce((s, p) => s + (p.display_percent || 0), 0);
      const rand = Math.random() * totalWeight;
      let cum = 0;
      for (const p of eligible) {
        cum += p.display_percent || 0;
        if (rand <= cum) return [{ url: p.banner_1_url!, name: p.name }];
      }
      return [{ url: eligible[eligible.length - 1].banner_1_url!, name: eligible[eligible.length - 1].name }];
    }
    return partners.filter((p) => p.banner_1_url).map((p) => ({ url: p.banner_1_url!, name: p.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedPartner?.id, partners.length]);

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
          model.photo_url,
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
    await new Promise((r) => setTimeout(r, 3000));
  };

  // ── PDF actions ──
  const handleDownloadPDF = async () => {
    if (isGeneratingPdf) return;
    const element = document.getElementById("proposal-content");
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const filename = `Proposta-${customerData.name.trim().replace(/\s+/g, "-")}-${today.replace(/\//g, "-")}.pdf`;
      await preparePdfAssets();
      await waitForPdfCaptureReady();

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
    if (!proposalId || whatsAppState !== "idle" || isGeneratingPdf) return;
    const element = document.getElementById("proposal-content");
    if (!element) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    setWhatsAppState("sending");
    setIsGeneratingPdf(true);
    setUploadProgress(0);
    setWhatsappStatus("Preparando proposta...");

    await new Promise((r) => setTimeout(r, 100));

    let attempts = 0;
    const maxAttempts = isMobile ? 2 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        setWhatsappStatus("Gerando PDF...");
        await preparePdfAssets();
        await waitForPdfCaptureReady();

        const pdfBlob = await generatePDFBlob({
          element,
          orientation: "portrait",
          sectionSelector: "[data-pdf-page]",
        });

        setWhatsappStatus("Enviando para WhatsApp...");
        const signedUrl = await savePdfToStorage(proposalId, pdfBlob, (p) => setUploadProgress(p));

        const result = await supabase.functions.invoke("send-whatsapp", {
          body: {
            type: "enviar_proposta",
            data: {
              customerPhone: formatPhoneForWhatsApp(customerData.whatsapp),
              customerName: customerData.name,
              storeName: storeName || "SimulaPool",
              pdfUrl: signedUrl,
            },
          },
        });
        if (result.error) throw new Error(result.error.message || "Erro na Edge Function");

        setWhatsappStatus("✓ Enviado!");
        setWhatsAppState("sent");
        toast.success("Proposta enviada para seu WhatsApp!");
        setTimeout(() => {
          setWhatsAppState("idle");
          setWhatsappStatus(null);
        }, 3000);
        return; // success — exit
      } catch (err) {
        console.error(`Erro WhatsApp (tentativa ${attempts}):`, err);

        // If mobile and we still have retries, continue
        if (isMobile && attempts < maxAttempts) {
          setWhatsappStatus("Tentando novamente...");
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        // Mobile fallback: open WhatsApp with link instead of PDF
        if (isMobile) {
          console.warn("Mobile fallback: opening WhatsApp with link");
          const proposalUrl = `${window.location.origin}/proposta/${proposalId}`;
          const phone = formatPhoneForWhatsApp(customerData.whatsapp);
          const fallbackMessage = `Olá ${customerData.name}! Segue o link da sua proposta:\n${proposalUrl}`;
          window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(fallbackMessage)}`,
            "_blank"
          );
          toast.info("PDF falhou no mobile. Abrindo WhatsApp com link da proposta.");
        } else {
          toast.error("Erro ao enviar proposta. Tente novamente.");
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
  }, [storeSettings?.logo_url, brandLogoUrl, partners, brandPartnerId, model.photo_url]);

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
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            {!hideDownloadPdf && (
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-2 h-9 sm:h-[48px] pl-4 pr-3 text-[13px] sm:text-[15px] font-semibold text-white bg-[#2d2d2d] rounded-full sm:rounded-[10px] transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                📥 PDF
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dc2626]">
                  <FileDown className="w-3.5 h-3.5 text-white" />
                </span>
              </button>
            )}
            {proposalId && !hideWhatsApp && (
              <button
                onClick={handleSendWhatsApp}
                disabled={whatsAppState !== "idle" || isGeneratingPdf}
                className="inline-flex items-center gap-2 h-9 sm:h-[48px] px-4 sm:px-5 text-[13px] sm:text-[15px] font-semibold text-white rounded-full sm:rounded-[10px] transition-all duration-150 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                style={{ backgroundColor: whatsAppState === "sent" ? "#16a34a" : "#25D366" }}
                onMouseEnter={(e) => { if (whatsAppState === "idle" && !isGeneratingPdf) e.currentTarget.style.backgroundColor = "#128C7E"; }}
                onMouseLeave={(e) => { if (whatsAppState === "idle") e.currentTarget.style.backgroundColor = "#25D366"; }}
              >
                📱 Receber no WhatsApp
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── PREVIEW = PDF (scrollable container, fixed 794px template) ── */}
      <main className="print:p-0" style={{ overflowX: "auto", padding: "16px 0" }}>
        <div style={{ width: "794px", margin: "0 auto" }}>
          <ProposalPdfTemplate
            model={model}
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
            includedItemsTotal={includedItemsTotal}
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

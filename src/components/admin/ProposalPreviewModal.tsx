import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, X, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProposalView from "@/components/simulator/ProposalView";
import QuizDataSummary from "@/components/leads/QuizDataSummary";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, User as UserIcon } from "lucide-react";

interface ProposalPreviewModalProps {
  proposal: any;
  onClose: () => void;
  store: { id?: string; name?: string; city?: string; state?: string; whatsapp?: string } | null;
  storeSettings: any;
  partners: any[];
  hideDownloadPdf?: boolean;
  hideWhatsApp?: boolean;
}

const ProposalPreviewModal = ({
  proposal,
  onClose,
  store,
  storeSettings,
  partners,
  hideDownloadPdf = true,
  hideWhatsApp = true,
}: ProposalPreviewModalProps) => {
  const [zoomed, setZoomed] = useState(false);
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.35);

  useEffect(() => {
    if (!isMobile || zoomed) return;
    const measure = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const containerH = container.clientHeight;
      const containerW = container.clientWidth;
      // Render at scale 1 to measure natural size
      const naturalW = content.scrollWidth;
      const naturalH = content.scrollHeight;
      if (naturalW === 0 || naturalH === 0) return;
      const scaleW = containerW / naturalW;
      const scaleH = containerH / naturalH;
      setFitScale(Math.min(scaleW, scaleH, 0.65));
    };
    // Delay to let content render
    const timer = setTimeout(measure, 150);
    return () => clearTimeout(timer);
  }, [isMobile, zoomed]);

  if (!proposal) return null;

  // Branch: construção (alvenaria/vinil) leads → render quiz summary instead of fibra proposal
  const isConstrucao = ["alvenaria", "vinil", "construcao"].includes(proposal.lead_type || "");
  if (isConstrucao) {
    const tipoLabel = proposal.lead_type === "alvenaria"
      ? "Alvenaria · sob medida"
      : proposal.lead_type === "vinil" ? "Vinil tela armada" : "Construção";
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-6"
        onClick={() => onClose()}
      >
        <div
          className="relative bg-background rounded-2xl shadow-2xl border border-border flex flex-col w-full max-w-md max-h-[88dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div>
              <p className="text-sm font-bold text-foreground">Resumo do Lead</p>
              <p className="text-[11px] text-muted-foreground">{tipoLabel}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 gap-2 rounded-lg bg-muted/40 border border-border p-3">
              <div className="flex items-center gap-2 text-sm"><UserIcon className="w-3.5 h-3.5 text-muted-foreground" /> <span className="font-medium">{proposal.customer_name}</span></div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> <span>{proposal.customer_city || "—"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> <span className="font-mono">{proposal.customer_whatsapp}</span></div>
            </div>
            <QuizDataSummary quizData={proposal.quiz_data} leadType={proposal.lead_type} />
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[11px]">
              Lead de construção — entre em contato para elaborar a proposta personalizada.
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  const pm = proposal.pool_models as any;
  const brand = pm?.categories?.brands;

  const model = {
    id: pm?.id,
    name: pm?.name || "Modelo",
    length: pm?.length,
    width: pm?.width,
    depth: pm?.depth,
    differentials: pm?.differentials || [],
    included_items: pm?.included_items || [],
    not_included_items: pm?.not_included_items || [],
    base_price: pm?.base_price || 0,
    delivery_days: pm?.delivery_days || 30,
    installation_days: pm?.installation_days || 5,
    payment_terms: pm?.payment_terms,
    photo_url: pm?.photo_url,
  };

  const selectedOptionals = Array.isArray(proposal.selected_optionals)
    ? proposal.selected_optionals.map((o: any) =>
        typeof o === "object" && o !== null
          ? { name: o.name || "Item", price: o.price || 0 }
          : { name: String(o), price: 0 }
      )
    : [];

  // Escala de leitura no mobile: ajusta a largura da proposta (794px) à largura da tela
  const [mobileScale, setMobileScale] = useState(0.48);
  useEffect(() => {
    if (!isMobile) return;
    const compute = () => {
      const w = window.innerWidth;
      setMobileScale(Math.min(1, w / 794));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [isMobile]);

  return (
    <div
      className="fixed inset-0 z-[70] flex md:items-center md:justify-center md:bg-black/50 md:backdrop-blur-sm md:p-6 bg-background"
      onClick={() => { if (!isMobile) { onClose(); setZoomed(false); } }}
    >
      <div
        className="relative bg-background md:rounded-2xl md:shadow-2xl md:border md:border-border flex flex-col w-full md:max-w-lg h-[100dvh] md:h-auto md:max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2.5 border-b border-border shrink-0 bg-background">
          {isMobile ? (
            <button
              onClick={() => { onClose(); setZoomed(false); }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
              <span className="text-sm font-medium text-foreground">Voltar</span>
            </button>
          ) : (
            <span className="text-sm font-bold text-foreground">Proposta</span>
          )}
          <div className="flex items-center gap-1.5">
            {!isMobile && (
              <button
                onClick={() => setZoomed(!zoomed)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                title={zoomed ? "Reduzir" : "Ampliar"}
              >
                {zoomed ? <ZoomOut className="w-4 h-4 text-muted-foreground" /> : <ZoomIn className="w-4 h-4 text-muted-foreground" />}
              </button>
            )}
            <button
              onClick={() => { onClose(); setZoomed(false); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Proposal content */}
        <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div
            ref={contentRef}
            style={
              isMobile
                ? {
                    transform: `scale(${mobileScale})`,
                    transformOrigin: "top left",
                    width: "794px",
                    height: `${(contentRef.current?.scrollHeight || 0) * mobileScale}px`,
                  }
                : {
                    transform: zoomed ? "scale(1)" : "scale(0.65)",
                    transformOrigin: "top center",
                    width: zoomed ? "100%" : "154%",
                    marginLeft: zoomed ? "0" : "-27%",
                    minHeight: zoomed ? "auto" : "154%",
                    transition: "transform 250ms ease, width 250ms ease, margin 250ms ease",
                  }
            }
          >
            <ProposalView
              model={model}
              selectedOptionals={selectedOptionals}
              customerData={{
                name: proposal.customer_name,
                city: proposal.customer_city,
                whatsapp: proposal.customer_whatsapp,
              }}
              category={pm?.categories?.name || pm?.name || ""}
              onBack={() => { onClose(); setZoomed(false); }}
              storeSettings={storeSettings}
              storeName={store?.name}
              storeCity={store?.city}
              storeState={store?.state}
              brandLogoUrl={brand?.logo_url}
              brandName={brand?.name}
              brandPartnerId={brand?.partner_id}
              partners={partners}
              storeId={store?.id}
              storeWhatsapp={store?.whatsapp}
              overrideTotalPrice={proposal?.total_price != null ? Number(proposal.total_price) : null}
              hideDownloadPdf={hideDownloadPdf}
              hideWhatsApp={hideWhatsApp}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalPreviewModal;

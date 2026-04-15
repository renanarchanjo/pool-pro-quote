import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProposalView from "@/components/simulator/ProposalView";

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

  const pm = proposal.pool_models as any;
  const brand = pm?.categories?.brands;

  const model = {
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-6"
      onClick={() => { onClose(); setZoomed(false); }}
    >
      <div
        className="relative bg-background rounded-2xl shadow-2xl border border-border flex flex-col w-full max-w-lg max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <span className="text-sm font-bold text-foreground">Proposta</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomed(!zoomed)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              title={zoomed ? "Reduzir" : "Ampliar"}
            >
              {zoomed ? <ZoomOut className="w-4 h-4 text-muted-foreground" /> : <ZoomIn className="w-4 h-4 text-muted-foreground" />}
            </button>
            <button
              onClick={() => { onClose(); setZoomed(false); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Proposal content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div
            style={{
              transform: zoomed ? "scale(1)" : "scale(0.65)",
              transformOrigin: "top center",
              width: zoomed ? "100%" : "154%",
              marginLeft: zoomed ? "0" : "-27%",
              minHeight: zoomed ? "auto" : "154%",
              transition: "transform 250ms ease, width 250ms ease, margin 250ms ease",
            }}
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

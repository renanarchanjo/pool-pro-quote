import simulapoolLogoFooter from "@/assets/simulapool-logo-footer.png?inline";

export interface PdfIncludedItem {
  name: string;
  item_type?: "material" | "mao_de_obra" | string;
}

export interface PdfTemplatePoolModel {
  name: string;
  length?: number | null;
  width?: number | null;
  depth?: number | null;
  differentials: string[];
  included_items: (string | PdfIncludedItem)[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
  payment_terms?: string | null;
  photo_url?: string | null;
}

export interface PdfTemplateOptional {
  name: string;
  price: number;
}

export interface PdfTemplateCustomer {
  name: string;
  city: string;
  whatsapp: string;
}

export interface PdfTemplatePartner {
  id: string;
  name: string;
  logo_url: string | null;
  banner_1_url: string | null;
  banner_2_url: string | null;
  display_percent?: number;
}

export interface ProposalPdfTemplateProps {
  model: PdfTemplatePoolModel;
  selectedOptionals: PdfTemplateOptional[];
  customerData: PdfTemplateCustomer;
  category: string;
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
  includedItemsTotal?: number;
  /** When provided, this value is used as the source of truth for the proposal total
   *  (e.g. when re-rendering a saved proposal from the database). */
  overrideTotalPrice?: number | null;
  partners?: PdfTemplatePartner[];
  bannersToShow: { url: string; name: string }[];
  resolveSrc: (url?: string | null) => string | null;
}

const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X = 36;
const PAD_Y = 0;
const FONT = "'Inter', sans-serif";

// Tokens de design
const C_INK = "#0F172A";        // Texto principal (slate-900)
const C_TEXT = "#334155";       // Corpo (slate-700)
const C_MUTED = "#64748B";      // Secundário (slate-500)
const C_FAINT = "#94A3B8";      // Labels (slate-400)
const C_DIVIDER = "#E8ECF0";    // Separador sutil
const C_SURFACE = "#F8F9FB";    // Fundo claro
const C_BLUE = "#1565C0";       // Azul escuro de destaque
const C_BLUE_DEEP = "#0D47A1";  // Variante mais profunda

const LABEL: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: C_FAINT,
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  margin: 0,
};

const PAGE_STYLE: React.CSSProperties = {
  width: `${PAGE_W}px`,
  height: `${PAGE_H}px`,
  backgroundColor: "#ffffff",
  fontFamily: FONT,
  color: C_TEXT,
  lineHeight: 1.55,
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const ProposalPdfTemplate = ({
  model,
  selectedOptionals,
  customerData,
  category,
  storeSettings,
  storeName,
  storeCity,
  storeState,
  storeWhatsapp,
  brandLogoUrl,
  brandName,
  includedItemsTotal = 0,
  overrideTotalPrice = null,
  partners = [],
  bannersToShow,
  resolveSrc,
}: ProposalPdfTemplateProps) => {
  // Apenas opcionais com valor > 0 aparecem na proposta (mas o cálculo total preserva tudo)
  const visibleOptionals = selectedOptionals.filter((o) => o.price > 0);
  const optionalsTotal = selectedOptionals.reduce((s, o) => s + o.price, 0);
  // If we have an authoritative saved total (e.g. from the DB), back-solve the
  // displayed "valor base" so that base + opcionais === total saved.
  const totalPrice = overrideTotalPrice != null
    ? overrideTotalPrice
    : model.base_price + includedItemsTotal + optionalsTotal;
  const displayBasePrice = overrideTotalPrice != null
    ? Math.max(0, overrideTotalPrice - optionalsTotal)
    : model.base_price + includedItemsTotal;

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString("pt-BR");
  const validUntil = new Date(
    todayDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("pt-BR");

  const storeLocation = [storeCity, storeState].filter(Boolean).join(" / ");
  const featuredBanner = bannersToShow[0] ?? null;
  const footerPartners = partners.filter((partner) => partner.logo_url);

  const isMaoDeObra = (item: string | PdfIncludedItem): boolean => {
    if (typeof item === "object" && item.item_type) return item.item_type === "mao_de_obra";
    return typeof item === "string" && item.includes("[MO]");
  };
  const getItemLabel = (item: string | PdfIncludedItem): string => {
    if (typeof item === "object") return item.name;
    return item.replace("[MO] ", "").replace("[MO]", "");
  };

  const materiais = model.included_items.filter((item) => !isMaoDeObra(item)).map(getItemLabel);
  const maoDeObra = model.included_items.filter(isMaoDeObra).map(getItemLabel);

  const dimensions = [
    model.length ? `${model.length}m` : null,
    model.width ? `${model.width}m` : null,
    model.depth ? `${model.depth}m` : null,
  ]
    .filter(Boolean)
    .join(" × ");

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div
        id="proposal-content"
        style={{
          width: `${PAGE_W}px`,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxSizing: "border-box",
        }}
      >
        <div data-pdf-page style={PAGE_STYLE}>
          {/* ── CABEÇALHO AZUL ── */}
          <div
            style={{
              height: "72px",
              minHeight: "72px",
              background: C_BLUE,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `0 ${PAD_X}px`,
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {storeSettings?.logo_url ? (
                <img
                  src={resolveSrc(storeSettings.logo_url) || undefined}
                  alt="Logo da loja"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  style={{ height: "40px", width: "auto", objectFit: "contain", maxWidth: "150px", filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {storeName || "SIMULAPOOL"}
                </div>
              )}
              {storeSettings?.logo_url && storeName && (
                <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.92)" }}>
                  {storeName}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.02em", color: "#FFFFFF" }}>
                Proposta Comercial
              </div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>
                Emitida em {today} · Válida até {validUntil}
              </div>
            </div>
          </div>

          {/* ── CONTEÚDO ── */}
          <div style={{ padding: `28px ${PAD_X}px 0`, flex: 1, display: "flex", flexDirection: "column" }}>
            {/* HERO: modelo + dimensões + banner */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 240px",
                gap: "32px",
                alignItems: "start",
                paddingBottom: "24px",
                borderBottom: `1px solid ${C_DIVIDER}`,
                marginBottom: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-block",
                    background: "#E3F2FD",
                    color: C_BLUE_DEEP,
                    fontSize: "10px",
                    fontWeight: 600,
                    borderRadius: "4px",
                    padding: "3px 9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    marginBottom: "12px",
                  }}
                >
                  {category}
                </div>
                <div style={{ fontSize: "26px", fontWeight: 600, color: C_INK, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
                  {model.name}
                </div>
                {dimensions && (
                  <div style={{ fontSize: "13px", color: C_MUTED, marginTop: "8px" }}>
                    Dimensões · {dimensions}
                  </div>
                )}
                {brandName && (
                  <div style={{ fontSize: "12px", color: C_MUTED, marginTop: "4px" }}>
                    Marca · <span style={{ color: C_TEXT, fontWeight: 500 }}>{brandName}</span>
                  </div>
                )}
              </div>

              <div>
                {featuredBanner ? (
                  <div
                    style={{
                      width: "240px",
                      height: "300px",
                      borderRadius: "6px",
                      backgroundColor: C_SURFACE,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={resolveSrc(featuredBanner.url) || featuredBanner.url}
                      alt={featuredBanner.name}
                      loading="eager"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "240px",
                      height: "300px",
                      background: C_SURFACE,
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: C_FAINT,
                      fontSize: "11px",
                      textAlign: "center",
                      padding: "16px",
                      boxSizing: "border-box",
                    }}
                  >
                    Banner indisponível
                  </div>
                )}
              </div>
            </div>

            {/* CLIENTE */}
            <div style={{ paddingBottom: "20px", borderBottom: `1px solid ${C_DIVIDER}`, marginBottom: "24px" }}>
              <p style={{ ...LABEL, marginBottom: "12px" }}>Cliente</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                {[
                  { label: "Nome", value: customerData.name },
                  { label: "WhatsApp", value: customerData.whatsapp },
                  { label: "Cidade", value: customerData.city },
                ].map((field) => (
                  <div key={field.label}>
                    <div style={{ fontSize: "10px", color: C_FAINT, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 500, marginBottom: "4px" }}>
                      {field.label}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: C_INK }}>
                      {field.value || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ITENS INCLUSOS */}
            {model.included_items.length > 0 && (
              <div style={{ paddingBottom: "20px", borderBottom: `1px solid ${C_DIVIDER}`, marginBottom: "24px" }}>
                <p style={{ ...LABEL, marginBottom: "14px" }}>Itens inclusos</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 32px" }}>
                  {materiais.length > 0 && (
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: C_BLUE, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
                        Equipamentos
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {materiais.map((item, i) => (
                          <li key={`m-${i}`} style={{ fontSize: "12px", color: C_TEXT, lineHeight: 1.7, position: "relative", paddingLeft: "14px", marginBottom: "3px" }}>
                            <span style={{ position: "absolute", left: 0, top: "8px", width: "5px", height: "5px", borderRadius: "50%", background: C_BLUE }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {maoDeObra.length > 0 && (
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
                        Mão de obra
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {maoDeObra.map((item, i) => (
                          <li key={`mo-${i}`} style={{ fontSize: "12px", color: C_TEXT, lineHeight: 1.7, position: "relative", paddingLeft: "14px", marginBottom: "3px" }}>
                            <span style={{ position: "absolute", left: 0, top: "8px", width: "5px", height: "5px", borderRadius: "50%", background: "#D97706" }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OPCIONAIS (apenas com valor > 0) */}
            {visibleOptionals.length > 0 && (
              <div style={{ paddingBottom: "20px", borderBottom: `1px solid ${C_DIVIDER}`, marginBottom: "24px" }}>
                <p style={{ ...LABEL, marginBottom: "12px" }}>Opcionais selecionados</p>
                <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                  <tbody>
                    {visibleOptionals.map((opt, i) => (
                      <tr key={i} style={{ borderBottom: i < visibleOptionals.length - 1 ? `1px solid ${C_DIVIDER}` : "none" }}>
                        <td style={{ padding: "10px 0", color: C_TEXT }}>{opt.name}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: C_INK, whiteSpace: "nowrap" }}>
                          {fmt(opt.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* NÃO INCLUSOS */}
            {model.not_included_items && model.not_included_items.length > 0 && (
              <div>
                <p style={{ ...LABEL, marginBottom: "12px", color: "#B91C1C" }}>Não inclusos</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 32px" }}>
                  {model.not_included_items.map((item, i) => (
                    <div key={i} style={{ fontSize: "12px", color: C_TEXT, position: "relative", paddingLeft: "14px" }}>
                      <span style={{ position: "absolute", left: 0, top: "8px", width: "5px", height: "5px", borderRadius: "50%", background: "#DC2626" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>


        <div data-pdf-page style={PAGE_STYLE}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "20px 24px" }}>
                <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 0", color: "#6B7280" }}>Valor base piscina</td>
                      <td style={{ padding: "6px 0", textAlign: "right", color: "#111827" }}>{fmt(displayBasePrice)}</td>
                    </tr>
                    {optionalsTotal > 0 && (
                      <tr>
                        <td style={{ padding: "6px 0", color: "#6B7280" }}>Opcionais</td>
                        <td style={{ padding: "6px 0", textAlign: "right", color: "#111827" }}>{fmt(optionalsTotal)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={2} style={{ padding: 0 }}>
                        <div style={{ borderBottom: "2px solid #E5E7EB", margin: "8px 0" }} />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 0", fontWeight: 700, fontSize: "18px", color: "#1A56DB" }}>TOTAL</td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, fontSize: "22px", color: "#1A56DB" }}>
                        {fmt(totalPrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
              <div>
                <p style={{ ...LABEL, marginBottom: "8px" }}>CONDIÇÕES COMERCIAIS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {([
                    ["Pagamento", model.payment_terms || "À vista"],
                    ["Entrega", `${model.delivery_days} dias`],
                    ["Instalação", `${model.installation_days} dias`],
                  ] as const).map(([label, value], i) => (
                    <div key={i}>
                      <span style={{ fontSize: "10px", color: "#9CA3AF" }}>{label}</span>
                      <div style={{ fontSize: "12px", color: "#111827" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ ...LABEL, marginBottom: "8px" }}>DADOS DA LOJA</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Empresa</span>
                    <div style={{ fontSize: "12px", color: "#111827" }}>{storeName || "-"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Cidade</span>
                    <div style={{ fontSize: "12px", color: "#111827" }}>{storeLocation || "-"}</div>
                  </div>
                  {storeWhatsapp && (
                    <div>
                      <span style={{ fontSize: "10px", color: "#9CA3AF" }}>WhatsApp</span>
                      <div style={{ fontSize: "12px", color: "#111827" }}>{storeWhatsapp}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {model.differentials && model.differentials.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ ...LABEL, marginBottom: "8px", paddingBottom: "4px", borderBottom: "1px solid #E5E7EB" }}>
                  DIFERENCIAIS
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                  {model.differentials.map((diff, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#10B981", fontWeight: 700, fontSize: "14px" }}>✓</span>
                      {diff}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── MARCAS PARCEIRAS (container separado acima do rodapé) ── */}
          {footerPartners.length > 0 && (
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid #E5E7EB",
                paddingTop: "14px",
                paddingBottom: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <p style={{ ...LABEL, textAlign: "center" }}>MARCAS PARCEIRAS</p>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px 16px" }}>
                {footerPartners.map((partner) => (
                  <div key={partner.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "24px" }}>
                    {resolveSrc(partner.logo_url) ? (
                      <img
                        src={resolveSrc(partner.logo_url)!}
                        alt={partner.name}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        style={{ height: "24px", width: "auto", objectFit: "contain", maxWidth: "84px" }}
                        onError={(e) => {
                          const t = e.currentTarget;
                          t.style.display = "none";
                          const fb = document.createElement("span");
                          fb.textContent = partner.name;
                          fb.style.cssText = "font-size:10px;font-weight:600;color:#6B7280";
                          t.parentElement?.appendChild(fb);
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "10px", fontWeight: 600, color: "#6B7280" }}>{partner.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RODAPÉ SIMULAPOOL ── */}
          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid #E5E7EB",
              paddingTop: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <img
              src={resolveSrc(simulapoolLogoFooter) || simulapoolLogoFooter}
              alt="SimulaPool"
              style={{ height: "20px", width: "auto", objectFit: "contain" }}
            />
            <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Desenvolvido e gerado por SimulaPool</span>
            <span style={{ fontSize: "10px", color: "#0EA5E9", fontWeight: 500 }}>www.simulapool.com</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProposalPdfTemplate;

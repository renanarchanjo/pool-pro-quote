import simulapoolLogoFooter from "@/assets/simulapool-logo-footer.png?inline";

export interface PdfTemplatePoolModel {
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
  partners?: PdfTemplatePartner[];
  bannersToShow: { url: string; name: string }[];
  resolveSrc: (url?: string | null) => string | null;
}

const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X = 28;
const PAD_Y = 28;
const FONT = "'Inter', sans-serif";
const TEXT = "#374151";

const LABEL: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: 0,
};

const PAGE_STYLE: React.CSSProperties = {
  width: `${PAGE_W}px`,
  height: `${PAGE_H}px`,
  backgroundColor: "#ffffff",
  fontFamily: FONT,
  color: TEXT,
  lineHeight: 1.45,
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  padding: `${PAD_Y}px ${PAD_X}px`,
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
  partners = [],
  bannersToShow,
  resolveSrc,
}: ProposalPdfTemplateProps) => {
  const displayBasePrice = model.base_price + includedItemsTotal;
  const optionalsTotal = selectedOptionals.reduce((s, o) => s + o.price, 0);
  const totalPrice = displayBasePrice + optionalsTotal;

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString("pt-BR");
  const validUntil = new Date(
    todayDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("pt-BR");

  const storeLocation = [storeCity, storeState].filter(Boolean).join(" / ");
  const featuredBanner = bannersToShow[0] ?? null;
  const footerPartners = partners.filter((partner) => partner.logo_url);
  const footerPartnerRows = footerPartners.length > 0 ? Math.ceil(footerPartners.length / 6) : 0;
  const footerReservedHeight = footerPartners.length > 0 ? 76 + footerPartnerRows * 28 : 56;

  const materiais = model.included_items.filter((item) => !item.includes("[MO]"));
  const maoDeObra = model.included_items
    .filter((item) => item.includes("[MO]"))
    .map((item) => item.replace("[MO] ", "").replace("[MO]", ""));

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingBottom: "16px",
              marginBottom: "20px",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {storeSettings?.logo_url && (
                <img
                  src={resolveSrc(storeSettings.logo_url) || undefined}
                  alt="Logo da loja"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  style={{ height: "40px", width: "auto", objectFit: "contain", maxWidth: "120px" }}
                />
              )}

              {brandLogoUrl && (
                <div
                  style={{
                    height: "28px",
                    width: "1px",
                    background: "#E5E7EB",
                    flexShrink: 0,
                  }}
                />
              )}

              {brandLogoUrl && (
                <img
                  src={resolveSrc(brandLogoUrl) || undefined}
                  alt={brandName || "Marca parceira"}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  style={{ height: "30px", width: "auto", objectFit: "contain", maxWidth: "140px" }}
                />
              )}

              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                  {storeName || "SIMULAPOOL"}
                </div>
                {storeLocation && (
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    {storeLocation}
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>
                Proposta Comercial
              </div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "4px" }}>
                Emitida em {today}
              </div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "1px" }}>
                Válida até {validUntil}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "456px 254px",
              gap: "28px",
              alignItems: "start",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>
                {model.name}
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: "#E0F2FE",
                  color: "#0369A1",
                  fontSize: "10px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  padding: "2px 8px",
                  textTransform: "uppercase",
                  marginTop: "6px",
                }}
              >
                {category}
              </div>
              {dimensions && (
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "8px" }}>
                  Dimensões: {dimensions}
                </div>
              )}
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginTop: "6px" }}>
                Valor base: {fmt(displayBasePrice)}
              </div>
            </div>

            <div>
              {featuredBanner ? (
                <div
                  style={{
                    width: "254px",
                    height: "316px",
                    backgroundImage: `url(${resolveSrc(featuredBanner.url) || featuredBanner.url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: "#F8F9FA",
                    borderRadius: "10px",
                    border: "1px solid #E5E7EB",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "254px",
                    height: "316px",
                    background: "#F8F9FA",
                    borderRadius: "10px",
                    border: "1px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9CA3AF",
                    fontSize: "11px",
                    textAlign: "center",
                    padding: "16px",
                    boxSizing: "border-box",
                  }}
                >
                  Banner da marca indisponível
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ ...LABEL, marginBottom: "8px" }}>CLIENTE</p>
            <div
              style={{
                background: "#F9FAFB",
                borderLeft: "3px solid #1A56DB",
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {[
                  { label: "Nome", value: customerData.name },
                  { label: "WhatsApp", value: customerData.whatsapp },
                  { label: "Cidade", value: customerData.city },
                ].map((field) => (
                  <div key={field.label}>
                    <div style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>
                      {field.label}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {model.included_items.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ ...LABEL, marginBottom: "8px" }}>ITENS INCLUSOS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {materiais.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                      EQUIPAMENTOS
                    </div>
                    <ul style={{ margin: 0, padding: 0 }}>
                      {materiais.map((item, i) => (
                        <li key={`m-${i}`} style={{ fontSize: "11px", color: "#374151", lineHeight: 1.6, listStyleType: "none", position: "relative", paddingLeft: "12px", marginBottom: "2px" }}>
                          <span style={{ position: "absolute", left: 0, color: "#0EA5E9", fontWeight: 700 }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {maoDeObra.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                      MÃO DE OBRA
                    </div>
                    <ul style={{ margin: 0, padding: 0 }}>
                      {maoDeObra.map((item, i) => (
                        <li key={`mo-${i}`} style={{ fontSize: "11px", color: "#374151", lineHeight: 1.6, listStyleType: "none", position: "relative", paddingLeft: "12px", marginBottom: "2px" }}>
                          <span style={{ position: "absolute", left: 0, color: "#F59E0B", fontWeight: 700 }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedOptionals.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <p style={{ ...LABEL, marginBottom: "8px" }}>OPCIONAIS</p>
              <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                <tbody>
                  {selectedOptionals.map((opt, i) => (
                    <tr key={i} style={{ borderBottom: i < selectedOptionals.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                      <td style={{ padding: "6px 0", color: "#374151" }}>{opt.name}</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                        {fmt(opt.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {model.not_included_items && model.not_included_items.length > 0 && (
            <div style={{ marginBottom: "0" }}>
              <p style={{ ...LABEL, marginBottom: "8px", color: "#DC2626" }}>NÃO INCLUSOS</p>
              <div style={{ borderLeft: "3px solid #EF4444", background: "#FEF2F2", padding: "10px 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                  {model.not_included_items.map((item, i) => (
                    <div key={i} style={{ fontSize: "11px", color: "#374151" }}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          data-pdf-page
          style={{
            ...PAGE_STYLE,
            position: "relative",
            paddingBottom: `${PAD_Y + footerReservedHeight}px`,
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

          <div
            style={{
              position: "absolute",
              left: `${PAD_X}px`,
              right: `${PAD_X}px`,
              bottom: `${PAD_Y}px`,
              borderTop: "1px solid #E5E7EB",
              paddingTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#ffffff",
            }}
          >
            {footerPartners.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img
                  src={resolveSrc(simulapoolLogoFooter) || simulapoolLogoFooter}
                  alt="SimulaPool"
                  style={{ height: "18px", width: "auto", objectFit: "contain" }}
                />
                <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Documento gerado por SimulaPool</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "10px", color: "#0EA5E9" }}>simulapool.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProposalPdfTemplate;

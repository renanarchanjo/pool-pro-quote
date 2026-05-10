import { useState, useEffect, useMemo } from "react";
import { Loader2, MapPin, MessageCircle, Shield, ArrowRight, Clock, User, Waves } from "lucide-react";
import { toast } from "sonner";
import BlurredPrice from "./BlurredPrice";
import { useGeolocation, STATES_LIST } from "@/hooks/useGeolocation";

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface CustomerFormProps {
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
  model: any;
  optionals: any[];
  includedItemsTotal?: number;
  hidePricing?: boolean;
}

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const CustomerForm = ({ onSubmit, model, optionals, includedItemsTotal = 0, hidePricing = false }: CustomerFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [formData, setFormData] = useState({ name: "", whatsapp: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { detectLocation, loading: geoLoading } = useGeolocation();

  const handleDetectLocation = async (silent = false) => {
    const loc = await detectLocation();
    if (loc) {
      setUf(loc.state);
      setCity(loc.city);
      toast.success(`Localização detectada: ${loc.city} / ${loc.state}`);
    } else if (!silent) {
      toast.info("Selecione seu estado e cidade manualmente abaixo.", {
        description: "Para detectar automaticamente, permita o acesso à localização no navegador.",
      });
    }
  };

  useEffect(() => {
    handleDetectLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!uf) { setCities([]); return; }
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        const data = await res.json();
        setCities(data.map((m: any) => m.nome));
      } catch { setCities([]); }
      finally { setLoadingCities(false); }
    };
    fetchCities();
  }, [uf]);

  const optionalsTotal = optionals.reduce((sum: number, opt: any) => sum + opt.price, 0);
  const totalPrice = model.base_price + includedItemsTotal + optionalsTotal;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (touched.name && formData.name.trim().length > 0 && formData.name.trim().length < 3)
      e.name = "Informe seu nome completo (mínimo 3 caracteres)";
    if (touched.whatsapp) {
      const digits = formData.whatsapp.replace(/\D/g, "");
      if (digits.length > 0 && digits.length !== 11)
        e.whatsapp = "Informe DDD + 9 dígitos (11 números)";
    }
    if (touched.uf && !uf) e.uf = "Selecione um estado";
    if (touched.city && !city) e.city = "Selecione uma cidade";
    return e;
  }, [formData, uf, city, touched]);

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, whatsapp: true, uf: true, city: true });
    if (!formData.name || !city || !uf || !formData.whatsapp) {
      toast.error("Preencha todos os campos");
      return;
    }
    const whatsappDigits = formData.whatsapp.replace(/\D/g, "");
    if (whatsappDigits.length !== 11) {
      toast.error("Informe DDD + 9 dígitos (11 números)");
      return;
    }
    if (formData.name.trim().length < 3) {
      toast.error("Informe seu nome completo");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ name: formData.name.trim(), city: `${city} / ${uf}`, whatsapp: formData.whatsapp });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-10">
      <div className="mb-7 sm:mb-8 sp-animate-in">
        <span className="sp-eyebrow">Etapa 3 de 4</span>
        <h1 className="sp-h1 mt-3 mb-1.5">Quase lá!</h1>
        <p className="sp-sub">Preencha seus dados para receber a proposta completa via WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-7 items-start">
        <form onSubmit={handleSubmit} className="sp-card-elevated p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b border-sp-border pb-4 mb-6">
            <div className="w-[40px] h-[40px] rounded-sp bg-sp-primary-100 flex items-center justify-center text-sp-primary flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="sp-h3">Seus dados</h2>
              <p className="text-[13px] text-sp-muted-fg">Usamos para gerar e enviar sua proposta.</p>
            </div>
          </div>

          {/* Nome */}
          <div className="sp-field mb-5">
            <label className="sp-label" htmlFor="name">Nome completo</label>
            <input
              id="name"
              type="text"
              className={`sp-input ${touched.name && errors.name ? 'sp-input--error' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={() => markTouched("name")}
              placeholder="Como podemos te chamar?"
              required
            />
            {touched.name && errors.name && <span className="sp-error">{errors.name}</span>}
          </div>

          {/* UF + Cidade */}
          <div className="grid grid-cols-[90px_1fr] sm:grid-cols-[100px_1fr] gap-3 mb-5 items-end">
            <div className="sp-field">
              <label className="sp-label" htmlFor="uf">UF</label>
              <select
                id="uf"
                className={`sp-select ${touched.uf && errors.uf ? 'sp-select--error' : ''}`}
                value={uf}
                onChange={(e) => { setUf(e.target.value); setCity(""); markTouched("uf"); }}
                onBlur={() => markTouched("uf")}
                required
              >
                <option value="">—</option>
                {STATES_LIST.map((s) => (
                  <option key={s.abbr} value={s.abbr}>{s.abbr}</option>
                ))}
              </select>
              {touched.uf && errors.uf && <span className="sp-error">{errors.uf}</span>}
            </div>
            <div className="sp-field">
              <label className="sp-label">
                <span>Cidade</span>
                <button
                  type="button"
                  onClick={() => handleDetectLocation(false)}
                  disabled={geoLoading}
                  className="inline-flex items-center gap-1 text-[11px] text-sp-primary font-semibold hover:underline disabled:opacity-50"
                >
                  {geoLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Detectando…</> : <><MapPin className="w-3 h-3" /> Usar localização</>}
                </button>
              </label>
              {loadingCities ? (
                <div className="sp-input flex items-center gap-2 text-sp-muted-fg">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Carregando cidades de {uf}…
                </div>
              ) : cities.length > 0 ? (
                <select
                  className={`sp-select ${touched.city && errors.city ? 'sp-select--error' : ''}`}
                  value={city}
                  onChange={(e) => { setCity(e.target.value); markTouched("city"); }}
                  onBlur={() => markTouched("city")}
                  required
                >
                  <option value="">Selecione a cidade</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className={`sp-input ${touched.city && errors.city ? 'sp-input--error' : ''}`}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => markTouched("city")}
                  placeholder="Selecione um estado primeiro"
                  required
                />
              )}
              {touched.city && errors.city && <span className="sp-error">{errors.city}</span>}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="sp-field mb-6">
            <label className="sp-label">
              <span>WhatsApp</span>
              <span className="sp-hint">a proposta vai por aqui</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-success">
                <MessageCircle className="w-4 h-4" />
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className={`sp-input sp-input-with-icon ${touched.whatsapp && errors.whatsapp ? 'sp-input--error' : ''}`}
                value={formData.whatsapp}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                  const formatted = digits
                    .replace(/^(\d{2})(\d)/, "($1) $2")
                    .replace(/(\d{5})(\d)/, "$1-$2");
                  setFormData({ ...formData, whatsapp: formatted });
                }}
                onBlur={() => markTouched("whatsapp")}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            {touched.whatsapp && errors.whatsapp && <span className="sp-error">{errors.whatsapp}</span>}
          </div>

          {/* Trust */}
          <div className="sp-trust-bar mb-6">
            <Shield className="w-4 h-4 text-sp-primary flex-shrink-0" />
            <span>Seus dados ficam protegidos. Sem spam, sem ligações fora do horário.</span>
          </div>

          <button type="submit" disabled={loading} className="sp-btn sp-btn-primary sp-btn-lg w-full">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando proposta…</>
            ) : (
              <>Gerar minha proposta <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Aside desktop */}
        <aside className="hidden lg:block sticky top-[140px]">
          <div className="sp-card-elevated p-5">
            <div className="flex gap-3 items-center mb-4">
              <div className="w-14 h-14 rounded-sp-sm overflow-hidden bg-sp-muted flex-shrink-0">
                {model.photo_url ? (
                  <img src={model.photo_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Waves className="w-5 h-5 text-sp-muted-fg" /></div>
                )}
              </div>
              <div className="min-w-0">
                <div className="sp-display font-bold text-[15px] text-sp-fg truncate">{model.name}</div>
                {(model.length || model.width) && (
                  <div className="text-[11.5px] text-sp-muted-fg">{model.length}×{model.width}m</div>
                )}
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-wider font-bold text-sp-muted-fg border-t border-sp-border pt-3 mb-3">Resumo do orçamento</div>
            <div className="flex justify-between items-baseline mb-2 text-[14px]">
              <span className="text-sp-muted-fg">Opcionais</span>
              <span className="font-semibold sp-tabular">{optionals.length} item{optionals.length !== 1 ? "ns" : ""}</span>
            </div>
            <div className="border-t border-sp-border my-3"></div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] uppercase tracking-wider font-bold text-sp-muted-fg">TOTAL</span>
              <span className="sp-display font-bold text-[22px] text-sp-primary sp-tabular">
                {hidePricing ? <BlurredPrice value={totalPrice} /> : formatCurrency(totalPrice)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-sp-muted-fg mt-3">
              <Clock className="w-3 h-3" /> Proposta válida por 30 dias.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CustomerForm;

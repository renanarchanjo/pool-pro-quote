import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import ModelSelection from "@/components/simulator/ModelSelection";
import OptionalsSelection from "@/components/simulator/OptionalsSelection";
import CustomerForm from "@/components/simulator/CustomerForm";
import ProposalView from "@/components/simulator/ProposalView";
import { Helmet } from "react-helmet-async";

interface PoolModel {
  id: string;
  name: string;
  category_id: string;
  store_id: string | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  photo_url: string | null;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
  payment_terms: string | null;
  notes: string | null;
}

interface Optional {
  id: string;
  name: string;
  description: string;
  price: number;
  group_id: string;
  warning_note: string | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string | null;
  partner_id?: string | null;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  banner_1_url: string | null;
  banner_2_url: string | null;
  display_percent?: number;
}

interface Category {
  id: string;
  name: string;
  brand_id: string | null;
}

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
}

interface StoreSettingsInfo {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

const SimuladorLoja = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState(1);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [modelOptionals, setModelOptionals] = useState<any[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [includedItemsTotal, setIncludedItemsTotal] = useState(0);
  const [proposalId, setProposalId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadStore(slug);
  }, [slug]);

  const loadStore = async (storeSlug: string) => {
    try {
      setLoading(true);

      // Fetch store by slug via public RPC (bypasses RLS)
      const { data: storeRows, error: storeError } = await supabase
        .rpc("get_store_public_by_slug", { _slug: storeSlug });

      if (storeError || !storeRows || storeRows.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const storeData = storeRows[0];
      setStore(storeData);

      // Load all store data in parallel
      const sid = storeData.id;
      const [modelsRes, brandsRes, catsRes, optionalsRes, modelOptsRes, settingsRes, partnersRes] = await Promise.all([
        supabase.rpc("get_pool_models_public", { _store_id: sid }),
        supabase.from("brands").select("id, name, logo_url, partner_id").eq("active", true).eq("store_id", sid).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).eq("store_id", sid).order("name"),
        supabase.rpc("get_optionals_public", { _store_id: sid }),
        supabase.rpc("get_model_optionals_public", { _store_id: sid }),
        supabase.rpc("get_store_settings_public", { _store_id: sid }),
        supabase.from("partners").select("id, name, logo_url, banner_1_url, banner_2_url, display_percent").eq("active", true).order("display_order"),
      ]);

      setModels(modelsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setOptionals(optionalsRes.data || []);
      setModelOptionals(modelOptsRes.data || []);
      setStoreSettings(settingsRes.data && settingsRes.data.length > 0 ? settingsRes.data[0] : null);
      setPartners(partnersRes.data || []);
    } catch (error) {
      console.error("Error loading store:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model: PoolModel) => {
    setSelectedModel(model);
    const fetchInclTotal = async () => {
      const { data } = await supabase.rpc("get_model_included_items_total", { _model_id: model.id });
      setIncludedItemsTotal(Number(data) || 0);
    };
    fetchInclTotal();
    setStep(2);
  };

  const handleOptionalsConfirm = (selectedIds: string[]) => {
    setSelectedOptionals(selectedIds);
    setStep(3);
  };

  const handleCustomerSubmit = async (data: CustomerData) => {
    if (!selectedModel || !store) return;

    try {
      const selectedGeneralOpts = optionals
        .filter(opt => selectedOptionals.includes(opt.id))
        .map(opt => ({ id: opt.id, name: opt.name, price: opt.price }));

      const selectedModelOpts = modelOptionals
        .filter((opt: any) => selectedOptionals.includes(opt.id))
        .map((opt: any) => ({ id: opt.id, name: opt.name, price: opt.price }));

      const allSelectedOpts = [...selectedGeneralOpts, ...selectedModelOpts];

      const { data: inclTotalData } = await supabase.rpc("get_model_included_items_total", { _model_id: selectedModel.id });
      const inclTotal = Number(inclTotalData) || 0;
      setIncludedItemsTotal(inclTotal);

      const optionalsPrice = allSelectedOpts.reduce((sum, opt) => sum + opt.price, 0);
      const totalPrice = selectedModel.base_price + inclTotal + optionalsPrice;

      const { sanitizeText, sanitizePhone, sanitizeCurrency } = await import("@/lib/sanitize");

      const { data: insertedRow, error } = await supabase
        .from("proposals")
        .insert({
          customer_name: sanitizeText(data.name, 200),
          customer_city: sanitizeText(data.city, 200),
          customer_whatsapp: sanitizePhone(data.whatsapp),
          model_id: selectedModel.id,
          selected_optionals: allSelectedOpts as any,
          total_price: sanitizeCurrency(totalPrice),
          store_id: store.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      setProposalId(insertedRow?.id || null);

      setCustomerData(data);
      setStep(4);
      setShowCongrats(true);
      toast.success("Proposta gerada com sucesso!");
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error("Erro ao criar proposta");
    }
  };

  const handleRestart = () => {
    setStep(1);
    setSelectedModel(null);
    setSelectedOptionals([]);
    setCustomerData(null);
    setShowCongrats(false);
    setIncludedItemsTotal(0);
  };

  const primaryColor = storeSettings?.primary_color || "#0ea5e9";

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  // 404
  if (notFound || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
            <span className="text-4xl">🏊</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Loja não encontrada</h1>
          <p className="text-slate-500 mb-8">
            Esta loja não está disponível no momento. Verifique o link ou tente novamente mais tarde.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // Proposal view (step 4)
  if (step === 4 && selectedModel && customerData) {
    const cat = categories.find(c => c.id === selectedModel.category_id);
    const brand = cat?.brand_id ? brands.find(b => b.id === cat.brand_id) : null;

    return (
      <>
        <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
          <DialogContent className="max-w-[300px] sm:max-w-md text-center p-5 sm:p-6">
            <DialogHeader className="items-center">
              <div className="mx-auto mb-2 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full" style={{ background: `${primaryColor}15` }}>
                <PartyPopper className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primaryColor }} />
              </div>
              <DialogTitle className="text-lg sm:text-xl">Parabéns! 🎉</DialogTitle>
              <DialogDescription className="text-sm sm:text-base mt-1.5 sm:mt-2">
                A equipe da <strong>{store.name}</strong> irá entrar em contato em breve!
              </DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <Button className="mt-3 sm:mt-4 w-full text-white text-sm sm:text-base" style={{ background: primaryColor }}>
                Ver Proposta
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
        <ProposalView
          model={selectedModel}
          selectedOptionals={[
            ...optionals.filter(opt => selectedOptionals.includes(opt.id)),
            ...modelOptionals.filter((opt: any) => selectedOptionals.includes(opt.id)).map((o: any) => ({ name: o.name, price: o.price })),
          ]}
          customerData={customerData}
          category="Piscina de Fibra"
          onBack={handleRestart}
          storeSettings={storeSettings}
          storeName={store.name}
          storeCity={store.city}
          storeState={store.state}
          brandLogoUrl={brand?.logo_url}
          brandName={brand?.name}
          brandPartnerId={brand?.partner_id}
          partners={partners}
          includedItemsTotal={includedItemsTotal}
          proposalId={proposalId}
          storeWhatsapp={store.whatsapp}
        />
      </>
    );
  }

  // Main simulator flow
  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{store.name} — Simulador de Piscinas</title>
        <meta name="description" content={`Simule sua piscina de fibra com ${store.name} em ${store.city || ""}/${store.state || ""}. Orçamento online em menos de 1 minuto.`} />
        <meta property="og:title" content={`${store.name} — Simulador de Piscinas`} />
        <meta property="og:description" content="Simule sua piscina e receba orçamento na hora!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://www.simulapool.com/s/${store.slug}`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
        {/* Nav with store branding */}
        <nav className="border-b border-slate-200/60 bg-white/95 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
            {/* Back */}
            <Button
              variant="ghost"
              size="sm"
              onClick={step === 1 ? () => navigate("/") : () => setStep(step - 1)}
              className="z-10"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden md:inline">Voltar</span>
            </Button>

            {/* Store branding - centered */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                {storeSettings?.logo_url ? (
                  <img
                    src={storeSettings.logo_url}
                    alt={store.name}
                    className="h-8 w-auto object-contain"
                  />
                ) : (
                  <span className="font-bold text-sm md:text-base" style={{ color: primaryColor }}>
                    {store.name}
                  </span>
                )}
              </div>
            </div>

            {/* Step indicator */}
            {step > 0 && step < 4 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 z-10">
                <span className="font-medium text-xs md:text-sm">Etapa {step} de 3</span>
              </div>
            ) : <div />}
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
          {step === 1 && models.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <span className="text-2xl">🏊</span>
              </div>
              <h2 className="text-xl font-bold mb-2 text-slate-900">Nenhum modelo disponível</h2>
              <p className="text-slate-500 text-sm mb-6">
                Esta loja ainda não cadastrou modelos de piscina. Volte mais tarde.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </div>
          ) : step === 1 ? (
            <ModelSelection
              models={models}
              brands={brands}
              categories={categories}
              onSelect={handleModelSelect}
              onBack={() => navigate("/")}
            />
          ) : null}

          {step === 2 && selectedModel && (
            <OptionalsSelection
              optionals={optionals}
              modelOptionals={modelOptionals.filter((o: any) => o.model_id === selectedModel.id)}
              selectedOptionals={selectedOptionals}
              onConfirm={handleOptionalsConfirm}
              onBack={() => setStep(1)}
              model={selectedModel}
              includedItemsTotal={includedItemsTotal}
              hidePricing
            />
          )}

          {step === 3 && selectedModel && (
            <CustomerForm
              onSubmit={handleCustomerSubmit}
              onBack={() => setStep(2)}
              model={selectedModel}
              optionals={[
                ...optionals.filter(opt => selectedOptionals.includes(opt.id)),
                ...modelOptionals.filter((opt: any) => selectedOptionals.includes(opt.id)).map((o: any) => ({ name: o.name, price: o.price, id: o.id, description: "", group_id: "", warning_note: null })),
              ]}
              includedItemsTotal={includedItemsTotal}
              hidePricing
            />
          )}
        </main>
      </div>
    </>
  );
};

export default SimuladorLoja;

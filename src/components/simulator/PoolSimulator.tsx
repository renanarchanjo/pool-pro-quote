import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import LocationStep from "./LocationStep";
import ModelSelection from "./ModelSelection";
import OptionalsSelection from "./OptionalsSelection";
import CustomerForm from "./CustomerForm";
import ProposalView from "./ProposalView";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

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

interface PoolSimulatorProps {
  onBack: () => void;
}

const PoolSimulator = ({ onBack }: PoolSimulatorProps) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [models, setModels] = useState<PoolModel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [modelOptionals, setModelOptionals] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [selectedStoreName, setSelectedStoreName] = useState<string>("");

  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [includedItemsTotal, setIncludedItemsTotal] = useState(0);

  // Store settings for proposal branding
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [storeCity, setStoreCity] = useState<string | null>(null);
  const [storeState, setStoreState] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  const loadStoreData = async (sid: string) => {
    try {
      setLoading(true);

      const poolModelCols = "id, name, category_id, base_price, delivery_days, installation_days, active, store_id, length, width, depth, display_order, differentials, included_items, not_included_items, photo_url, payment_terms, notes, created_at, updated_at";
      const optionalCols = "id, name, description, price, group_id, store_id, display_order, active, warning_note, created_at, updated_at";
      const modelOptCols = "id, model_id, store_id, price, active, display_order, name, description, created_at, updated_at";

      const [modelsRes, brandsRes, catsRes, optionalsRes, modelOptsRes, settingsRes, storeRes, partnersRes] = await Promise.all([
        supabase.rpc("get_pool_models_public", { _store_id: sid }),
        supabase.from("brands").select("id, name, logo_url, partner_id").eq("active", true).eq("store_id", sid).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).eq("store_id", sid).order("name"),
        supabase.rpc("get_optionals_public", { _store_id: sid }),
        supabase.rpc("get_model_optionals_public", { _store_id: sid }),
        supabase.from("store_settings").select("*").eq("store_id", sid).maybeSingle(),
        supabase.rpc("get_store_public_by_id", { _id: sid }),
        supabase.from("partners").select("id, name, logo_url, banner_1_url, banner_2_url, display_percent").eq("active", true).order("display_order"),
      ]);

      if (modelsRes.error) throw modelsRes.error;

      setStoreId(sid);
      setModels(modelsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setOptionals(optionalsRes.data || []);
      setModelOptionals(modelOptsRes.data || []);
      setStoreSettings(settingsRes.data || null);
      setPartners(partnersRes.data || []);
      if (storeRes.data && storeRes.data.length > 0) {
        setSelectedStoreName(storeRes.data[0].name);
        setStoreCity(storeRes.data[0].city);
        setStoreState(storeRes.data[0].state);
      }
      setStep(1);
    } catch (error) {
      console.error("Error loading store data:", error);
      toast.error("Erro ao carregar dados da loja");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (store: { id: string; name: string }) => {
    setSelectedStoreName(store.name);
    loadStoreData(store.id);
  };

  const handleSkipLocation = async () => {
    try {
      setLoading(true);
      const poolModelCols = "id, name, category_id, base_price, delivery_days, installation_days, active, store_id, length, width, depth, display_order, differentials, included_items, not_included_items, photo_url, payment_terms, notes, created_at, updated_at";
      const optionalCols = "id, name, description, price, group_id, store_id, display_order, active, warning_note, created_at, updated_at";
      const modelOptCols = "id, model_id, store_id, price, active, display_order, name, description, created_at, updated_at";

      const [modelsRes, brandsRes, catsRes, optionalsRes, modelOptsRes] = await Promise.all([
        supabase.rpc("get_pool_models_public"),
        supabase.from("brands").select("id, name, partner_id").eq("active", true).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).order("name"),
        supabase.rpc("get_optionals_public"),
        supabase.rpc("get_model_optionals_public"),
      ]);
      if (modelsRes.error) throw modelsRes.error;
      setModels(modelsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setOptionals(optionalsRes.data || []);
      setModelOptionals(modelOptsRes.data || []);
      setSelectedStoreName("Todas as lojas");
      setStep(1);
    } catch (error) {
      console.error("Error loading all data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model: PoolModel) => {
    if (!storeId && model.store_id) {
      setStoreId(model.store_id);
      loadStoreData(model.store_id);
    }

    setSelectedModel(model);

    // Fetch included items total for selected model
    const fetchInclTotal = async () => {
      const { data } = await supabase
        .from("model_included_items")
        .select("price")
        .eq("model_id", model.id)
        .eq("active", true);
      setIncludedItemsTotal((data || []).reduce((sum, item) => sum + Number(item.price), 0));
    };
    fetchInclTotal();

    setStep(2);
  };

  const handleOptionalsConfirm = (selectedIds: string[]) => {
    setSelectedOptionals(selectedIds);
    setStep(3);
  };

  const handleCustomerSubmit = async (data: CustomerData) => {
    if (!selectedModel) return;

    const targetStoreId = storeId ?? selectedModel.store_id;

    if (!targetStoreId) {
      toast.error("Não foi possível identificar a loja da proposta");
      return;
    }

    try {
      const selectedGeneralOpts = optionals
        .filter(opt => selectedOptionals.includes(opt.id))
        .map(opt => ({ id: opt.id, name: opt.name, price: opt.price }));

      const selectedModelOpts = modelOptionals
        .filter((opt: any) => selectedOptionals.includes(opt.id))
        .map((opt: any) => ({ id: opt.id, name: opt.name, price: opt.price }));

      const allSelectedOpts = [...selectedGeneralOpts, ...selectedModelOpts];

      // Fetch included items total for this model
      const { data: inclItems } = await supabase
        .from("model_included_items")
        .select("price")
        .eq("model_id", selectedModel.id)
        .eq("active", true);
      const inclTotal = (inclItems || []).reduce((sum, item) => sum + Number(item.price), 0);
      setIncludedItemsTotal(inclTotal);

      const optionalsPrice = allSelectedOpts.reduce((sum, opt) => sum + opt.price, 0);
      const totalPrice = selectedModel.base_price + inclTotal + optionalsPrice;

      const { error } = await supabase
        .from("proposals")
        .insert({
          customer_name: data.name,
          customer_city: data.city,
          customer_whatsapp: data.whatsapp,
          model_id: selectedModel.id,
          selected_optionals: allSelectedOpts as any,
          total_price: totalPrice,
          store_id: targetStoreId,
        });

      if (error) throw error;

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
    setStep(0);
    setSelectedModel(null);
    setSelectedOptionals([]);
    setCustomerData(null);
    setProposalId(null);
    setStoreId(null);
    setModels([]);
    setBrands([]);
    setCategories([]);
    setOptionals([]);
    setShowCongrats(false);
    setStoreSettings(null);
    setIncludedItemsTotal(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 4 && selectedModel && customerData) {
    return (
      <>
        <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader className="items-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <PartyPopper className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">Parabéns! 🎉</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Em breve, um de nossos parceiros lojistas, o mais próximo possível de você, irá entrar em contato!
              </DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <Button className="mt-4 w-full gradient-primary text-white">Ver Proposta</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
        {(() => {
          const cat = categories.find(c => c.id === selectedModel.category_id);
          const brand = cat?.brand_id ? brands.find(b => b.id === cat.brand_id) : null;
          return (
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
              storeName={selectedStoreName !== "Todas as lojas" ? selectedStoreName : undefined}
              storeCity={storeCity}
              storeState={storeState}
              brandLogoUrl={brand?.logo_url}
              brandName={brand?.name}
              brandPartnerId={brand?.partner_id}
              partners={partners}
              includedItemsTotal={includedItemsTotal}
            />
          );
        })()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b border-border/30 bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === 0 ? onBack : () => setStep(step === 1 ? 0 : step - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-8 object-contain" />
          </div>
          {step > 0 && step < 4 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Etapa {step} de 3</span>
              {selectedStoreName && (
                <span className="hidden md:inline ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {selectedStoreName}
                </span>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {step === 0 && (
          <LocationStep
            onSelectStore={handleSelectStore}
            onBack={onBack}
            onSkip={handleSkipLocation}
          />
        )}

        {step === 1 && models.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">🏊</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Nenhum modelo disponível</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Esta loja ainda não cadastrou modelos de piscina. Tente outra loja ou volte mais tarde.
            </p>
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Escolher outra loja
            </Button>
          </div>
        ) : step === 1 ? (
          <ModelSelection
            models={models}
            brands={brands}
            categories={categories}
            onSelect={handleModelSelect}
            onBack={() => setStep(0)}
          />
        ) : null}

        {step === 2 && selectedModel && (
          <OptionalsSelection
            optionals={optionals}
            modelOptionals={selectedModel ? modelOptionals.filter((o: any) => o.model_id === selectedModel.id) : []}
            selectedOptionals={selectedOptionals}
            onConfirm={handleOptionalsConfirm}
            onBack={() => setStep(1)}
            model={selectedModel}
            includedItemsTotal={includedItemsTotal}
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
          />
        )}
      </main>
    </div>
  );
};

export default PoolSimulator;

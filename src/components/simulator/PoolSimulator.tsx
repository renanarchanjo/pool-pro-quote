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

  // Store settings for proposal branding
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [storeCity, setStoreCity] = useState<string | null>(null);
  const [storeState, setStoreState] = useState<string | null>(null);

  const loadStoreData = async (sid: string) => {
    try {
      setLoading(true);

      const [modelsRes, brandsRes, catsRes, optionalsRes, modelOptsRes, settingsRes, storeRes] = await Promise.all([
        supabase.from("pool_models").select("*").eq("active", true).eq("store_id", sid).order("display_order"),
        supabase.from("brands").select("id, name").eq("active", true).eq("store_id", sid).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).eq("store_id", sid).order("name"),
        supabase.from("optionals").select("*").eq("active", true).eq("store_id", sid).order("display_order"),
        supabase.from("model_optionals").select("*").eq("active", true).eq("store_id", sid).order("display_order"),
        supabase.from("store_settings").select("*").eq("store_id", sid).maybeSingle(),
        supabase.from("stores").select("name, city, state").eq("id", sid).single(),
      ]);

      if (modelsRes.error) throw modelsRes.error;

      setStoreId(sid);
      setModels(modelsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setOptionals(optionalsRes.data || []);
      setModelOptionals(modelOptsRes.data || []);
      setStoreSettings(settingsRes.data || null);
      if (storeRes.data) {
        setSelectedStoreName(storeRes.data.name);
        setStoreCity(storeRes.data.city);
        setStoreState(storeRes.data.state);
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
      const [modelsRes, brandsRes, catsRes, optionalsRes, modelOptsRes] = await Promise.all([
        supabase.from("pool_models").select("*").eq("active", true).order("display_order"),
        supabase.from("brands").select("id, name").eq("active", true).order("name"),
        supabase.from("categories").select("id, name, brand_id").eq("active", true).order("name"),
        supabase.from("optionals").select("*").eq("active", true).order("display_order"),
        supabase.from("model_optionals").select("*").eq("active", true).order("display_order"),
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
    setSelectedModel(model);
    setStep(2);
  };

  const handleOptionalsConfirm = (selectedIds: string[]) => {
    setSelectedOptionals(selectedIds);
    setStep(3);
  };

  const handleCustomerSubmit = async (data: CustomerData) => {
    if (!selectedModel) return;

    try {
      const optionalsPrice = optionals
        .filter(opt => selectedOptionals.includes(opt.id))
        .reduce((sum, opt) => sum + opt.price, 0);

      const modelOptsPrice = modelOptionals
        .filter(opt => selectedOptionals.includes(opt.id))
        .reduce((sum: number, opt: any) => sum + opt.price, 0);

      const totalPrice = selectedModel.base_price + optionalsPrice + modelOptsPrice;

      const { data: proposal, error } = await supabase
        .from("proposals")
        .insert({
          customer_name: data.name,
          customer_city: data.city,
          customer_whatsapp: data.whatsapp,
          model_id: selectedModel.id,
          selected_optionals: selectedOptionals,
          total_price: totalPrice,
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;

      setCustomerData(data);
      setProposalId(proposal.id);
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
        />
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

        {step === 1 && (
          <ModelSelection
            models={models}
            brands={brands}
            categories={categories}
            onSelect={handleModelSelect}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && selectedModel && (
          <OptionalsSelection
            optionals={optionals}
            modelOptionals={selectedModel ? modelOptionals.filter((o: any) => o.model_id === selectedModel.id) : []}
            selectedOptionals={selectedOptionals}
            onConfirm={handleOptionalsConfirm}
            onBack={() => setStep(1)}
            model={selectedModel}
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

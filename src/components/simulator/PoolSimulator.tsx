import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CategorySelection from "./CategorySelection";
import ModelSelection from "./ModelSelection";
import OptionalsSelection from "./OptionalsSelection";
import CustomerForm from "./CustomerForm";
import ProposalView from "./ProposalView";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

interface Category {
  id: string;
  name: string;
  description: string;
}

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

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface PoolSimulatorProps {
  onBack: () => void;
}

const PoolSimulator = ({ onBack }: PoolSimulatorProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [storeRes, categoriesRes, modelsRes, optionalsRes] = await Promise.all([
        supabase.from("stores").select("id").limit(1).single(),
        supabase.from("categories").select("*").eq("active", true).order("name"),
        supabase.from("pool_models").select("*").eq("active", true).order("name"),
        supabase.from("optionals").select("*").eq("active", true).order("display_order")
      ]);

      if (storeRes.error) throw storeRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (modelsRes.error) throw modelsRes.error;
      if (optionalsRes.error) throw optionalsRes.error;

      setStoreId(storeRes.data.id);
      setCategories(categoriesRes.data || []);
      setModels(modelsRes.data || []);
      setOptionals(optionalsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep(2);
  };

  const handleModelSelect = (model: PoolModel) => {
    setSelectedModel(model);
    setStep(3);
  };

  const handleOptionalsConfirm = (selectedIds: string[]) => {
    setSelectedOptionals(selectedIds);
    setStep(4);
  };

  const handleCustomerSubmit = async (data: CustomerData) => {
    if (!selectedModel || !storeId) return;

    try {
      const optionalsPrice = optionals
        .filter(opt => selectedOptionals.includes(opt.id))
        .reduce((sum, opt) => sum + opt.price, 0);

      const totalPrice = selectedModel.base_price + optionalsPrice;

      const { data: proposal, error } = await supabase
        .from("proposals")
        .insert({
          customer_name: data.name,
          customer_city: data.city,
          customer_whatsapp: data.whatsapp,
          model_id: selectedModel.id,
          selected_optionals: selectedOptionals,
          total_price: totalPrice,
          store_id: storeId
        })
        .select()
        .single();

      if (error) throw error;

      setCustomerData(data);
      setProposalId(proposal.id);
      setStep(5);
      toast.success("Proposta gerada com sucesso!");
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error("Erro ao criar proposta");
    }
  };

  const handleRestart = () => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedModel(null);
    setSelectedOptionals([]);
    setCustomerData(null);
    setProposalId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 5 && selectedModel && customerData) {
    return (
      <ProposalView
        model={selectedModel}
        selectedOptionals={optionals.filter(opt => selectedOptionals.includes(opt.id))}
        customerData={customerData}
        category={categories.find(c => c.id === selectedCategory)?.name || ""}
        onBack={handleRestart}
      />
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
              onClick={step === 1 ? onBack : () => setStep(step - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-8 object-contain" />
          </div>
          {step < 5 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Etapa {step} de 4</span>
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {step === 1 && (
          <CategorySelection
            categories={categories}
            onSelect={handleCategorySelect}
          />
        )}

        {step === 2 && selectedCategory && (
          <ModelSelection
            models={models.filter(m => m.category_id === selectedCategory)}
            onSelect={handleModelSelect}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && selectedModel && (
          <OptionalsSelection
            optionals={optionals}
            selectedOptionals={selectedOptionals}
            onConfirm={handleOptionalsConfirm}
            onBack={() => setStep(2)}
            model={selectedModel}
          />
        )}

        {step === 4 && selectedModel && (
          <CustomerForm
            onSubmit={handleCustomerSubmit}
            onBack={() => setStep(3)}
            model={selectedModel}
            optionals={optionals.filter(opt => selectedOptionals.includes(opt.id))}
          />
        )}
      </main>
    </div>
  );
};

export default PoolSimulator;

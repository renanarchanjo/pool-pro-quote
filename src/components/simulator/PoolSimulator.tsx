import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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

interface Category {
  id: string;
  name: string;
  description: string;
}

interface PoolModel {
  id: string;
  name: string;
  category_id: string;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
}

interface Optional {
  id: string;
  name: string;
  description: string;
  price: number;
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
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get("store");
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeSettings, setStoreSettings] = useState<{logo_url: string | null; primary_color: string; secondary_color: string} | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<PoolModel[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [storeSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // If store slug is provided, fetch store_id first
      let currentStoreId: string | null = null;
      
      if (storeSlug) {
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id")
          .eq("slug", storeSlug)
          .single();

        if (storeError || !storeData) {
          toast.error("Loja não encontrada");
          return;
        }

        currentStoreId = storeData.id;
        setStoreId(currentStoreId);

        // Load store settings
        const { data: settingsData } = await supabase
          .from("store_settings")
          .select("logo_url, primary_color, secondary_color")
          .eq("store_id", currentStoreId)
          .single();

        setStoreSettings(settingsData);
      }
      
      const [categoriesRes, modelsRes, optionalsRes] = await Promise.all([
        currentStoreId 
          ? supabase.from("categories").select("*").eq("active", true).eq("store_id", currentStoreId)
          : supabase.from("categories").select("*").eq("active", true),
        currentStoreId
          ? supabase.from("pool_models").select("*").eq("active", true).eq("store_id", currentStoreId)
          : supabase.from("pool_models").select("*").eq("active", true),
        currentStoreId
          ? supabase.from("optionals").select("*").eq("active", true).eq("store_id", currentStoreId)
          : supabase.from("optionals").select("*").eq("active", true)
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (modelsRes.error) throw modelsRes.error;
      if (optionalsRes.error) throw optionalsRes.error;

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
    if (!selectedModel) return;

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
          ...(storeId ? { store_id: storeId } : {})
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
        onBack={onBack}
      />
    );
  }

  if (step === 5 && selectedModel && customerData) {
    return (
      <ProposalView
        model={selectedModel}
        selectedOptionals={optionals.filter(opt => selectedOptionals.includes(opt.id))}
        customerData={customerData}
        category={categories.find(c => c.id === selectedCategory)?.name || ""}
        onBack={onBack}
        storeSettings={storeSettings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-8 shadow-card">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full mx-1 transition-colors ${
                    step >= s ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Passo {step} de 4
            </p>
          </div>

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
            />
          )}

          {step === 4 && (
            <CustomerForm
              onSubmit={handleCustomerSubmit}
              onBack={() => setStep(3)}
            />
          )}
        </Card>
      </main>
    </div>
  );
};

export default PoolSimulator;

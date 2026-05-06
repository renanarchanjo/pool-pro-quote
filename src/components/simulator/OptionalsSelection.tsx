import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BlurredPrice from "./BlurredPrice";
import { Badge } from "@/components/ui/badge";

interface Optional {
  id: string;
  name: string;
  description: string;
  price: number;
  group_id: string;
  warning_note: string | null;
}

interface OptionalGroup {
  id: string;
  name: string;
  description: string | null;
  selection_type: string;
  display_order: number;
}

interface ModelOptionalItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface OptionalsSelectionProps {
  optionals: Optional[];
  modelOptionals?: ModelOptionalItem[];
  selectedOptionals: string[];
  onConfirm: (selectedIds: string[]) => void;
  onBack: () => void;
  model: any;
  includedItemsTotal?: number;
  hidePricing?: boolean;
}

const OptionalsSelection = ({ optionals, modelOptionals = [], selectedOptionals: initialSelected, onConfirm, onBack, model, includedItemsTotal = 0, hidePricing = false }: OptionalsSelectionProps) => {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [selectedModelOpts, setSelectedModelOpts] = useState<string[]>([]);
  const [groups, setGroups] = useState<OptionalGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    // Restore initial selections by group
    if (initialSelected.length > 0) {
      const restored: Record<string, string[]> = {};
      initialSelected.forEach((optId) => {
        const opt = optionals.find(o => o.id === optId);
        if (opt) {
          if (!restored[opt.group_id]) {
            restored[opt.group_id] = [];
          }
          restored[opt.group_id].push(optId);
        }
      });
      setSelected(restored);
    }
  }, [initialSelected, optionals]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("optional_groups")
        .select("id, name, description, selection_type, display_order")
        .eq("active", true)
        .order("display_order");

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGroupType = (groupId: string): string => {
    return groups.find((g) => g.id === groupId)?.selection_type || "single";
  };

  const handleSelectOptional = (groupId: string, optionalId: string, _selectionType?: string) => {
    const selectionType = getGroupType(groupId);
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionalId)) {
        // Em grupos single não permite desmarcar (sempre 1 selecionado)
        if (selectionType === "single") return prev;
        return { ...prev, [groupId]: current.filter((id) => id !== optionalId) };
      }
      // Single: substitui (apenas 1 por grupo). Multiple: adiciona.
      if (selectionType === "single") {
        return { ...prev, [groupId]: [optionalId] };
      }
      return { ...prev, [groupId]: [...current, optionalId] };
    });
  };

  // Garante que grupos "single" nunca tenham mais de 1 item selecionado
  useEffect(() => {
    if (groups.length === 0) return;
    setSelected((prev) => {
      let changed = false;
      const next: Record<string, string[]> = {};
      for (const [gid, ids] of Object.entries(prev)) {
        const type = getGroupType(gid);
        if (type === "single" && ids.length > 1) {
          next[gid] = [ids[0]];
          changed = true;
        } else {
          next[gid] = ids;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const handleContinue = () => {
    const allSelected = [...Object.values(selected).flat(), ...selectedModelOpts];
    onConfirm(allSelected);
  };

  const toggleModelOpt = (id: string) => {
    setSelectedModelOpts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const calculateTotal = () => {
    let total = model.base_price + includedItemsTotal;
    Object.values(selected).flat().forEach((optId) => {
      const optional = optionals.find((o) => o.id === optId);
      if (optional) total += optional.price;
    });
    selectedModelOpts.forEach((optId) => {
      const mOpt = modelOptionals.find((o) => o.id === optId);
      if (mOpt) total += mOpt.price;
    });
    return total;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Banner do modelo escolhido - agora no topo */}
      <Card className="p-6 mb-8 bg-card/80 backdrop-blur-sm border-2 border-primary/30 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-6">
          {model.photo_url && (
            <div className="w-full md:w-48 h-48 bg-white rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={model.photo_url} 
                alt={model.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement?.classList.add("bg-blue-50");
                }}
              />
            </div>
          )}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold">{model.name}</h1>
              {(model.length || model.width || model.depth) && (
                <Badge variant="secondary" className="text-sm">
                  {model.length}m x {model.width}m x {model.depth}m
                </Badge>
              )}
            </div>
            
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">Itens inclusos:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {(model.included_items && model.included_items.length > 0 ? model.included_items : ["Consulte o lojista para detalhes"]).map((item: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Título da seção de opcionais */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
          Personalize sua Piscina
        </h2>
        <p className="text-muted-foreground">
          Selecione os opcionais desejados
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {groups.map((group) => {
          const groupOptionals = optionals.filter((o) => o.group_id === group.id).sort((a, b) => a.price - b.price);
          if (groupOptionals.length === 0) return null;

          return (
            <Card key={group.id} className="p-6 bg-card/80 backdrop-blur-sm">
              <h3 className="text-xl font-display font-bold mb-2">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
              )}

              {group.selection_type === "single" ? (
                <div className="grid gap-2.5">
                  {groupOptionals.map((optional) => {
                    const isSelected = selected[group.id]?.[0] === optional.id;
                    return (
                      <div key={optional.id} className="space-y-2">
                        <div
                          onClick={() => handleSelectOptional(group.id, optional.id, "single")}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="font-semibold text-[15px] leading-snug">{optional.name}</p>
                            {optional.description && (
                              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{optional.description}</p>
                            )}
                            {!hidePricing && (
                              <p className="font-bold text-primary text-[15px] mt-2">
                                {`+ R$ ${optional.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {optional.warning_note && isSelected && (
                          <Alert variant="destructive" className="ml-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{optional.warning_note}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {groupOptionals.map((optional) => {
                    const isSelected = selected[group.id]?.includes(optional.id) || false;
                    return (
                      <div key={optional.id} className="space-y-2">
                        <div
                          onClick={() => handleSelectOptional(group.id, optional.id, "multiple")}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-[15px] leading-snug">{optional.name}</p>
                            </div>
                            {optional.description && (
                              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{optional.description}</p>
                            )}
                            {!hidePricing && (
                              <p className="font-bold text-primary text-[15px] mt-2">
                                {`+ R$ ${optional.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {optional.warning_note && isSelected && (
                          <Alert variant="destructive" className="ml-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{optional.warning_note}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}


        {/* Model-specific optionals */}
        {modelOptionals.length > 0 && (
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-accent/30">
            <h3 className="text-xl font-display font-bold mb-2">Opcionais Dimensionados — {model.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">Opcionais calculados especificamente para este modelo</p>
            <div className="grid gap-2.5">
              {modelOptionals.map((mOpt) => {
                const isSelected = selectedModelOpts.includes(mOpt.id);
                return (
                  <div
                    key={mOpt.id}
                    onClick={() => toggleModelOpt(mOpt.id)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="font-semibold text-[15px] leading-snug">{mOpt.name}</p>
                      {mOpt.description && (
                        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{mOpt.description}</p>
                      )}
                      {!hidePricing && (
                        <p className="font-bold text-primary text-[15px] mt-2">
                          {`+ R$ ${mOpt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Card className="p-4 md:p-6 bg-card/80 backdrop-blur-sm border-2 border-primary sticky bottom-4">
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">Total do Orçamento</p>
            <p className="text-xl md:text-3xl font-display font-bold text-primary truncate">
              {hidePricing ? <BlurredPrice value={calculateTotal()} className="text-xl md:text-3xl" /> : `R$ ${calculateTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            </p>
          </div>
          <Button className="gradient-primary text-white px-5 md:px-8 shrink-0" size="lg" onClick={handleContinue}>
            Continuar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OptionalsSelection;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, Waves, Ruler, Truck, Wrench, Sun, Lightbulb, Droplet, Plus, Info, ArrowRight } from "lucide-react";
import BlurredPrice from "./BlurredPrice";

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

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const groupIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("aquec")) return <Sun className="w-5 h-5" />;
  if (n.includes("ilumin") || n.includes("led")) return <Lightbulb className="w-5 h-5" />;
  if (n.includes("trat") || n.includes("água") || n.includes("agua")) return <Droplet className="w-5 h-5" />;
  return <Plus className="w-5 h-5" />;
};

const OptionalsSelection = ({ optionals, modelOptionals = [], selectedOptionals: initialSelected, onConfirm, model, includedItemsTotal = 0, hidePricing = false }: OptionalsSelectionProps) => {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [selectedModelOpts, setSelectedModelOpts] = useState<string[]>([]);
  const [groups, setGroups] = useState<OptionalGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
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

  const handleSelectOptional = (groupId: string, optionalId: string) => {
    const selectionType = getGroupType(groupId);
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionalId)) {
        if (selectionType === "single") return prev;
        return { ...prev, [groupId]: current.filter((id) => id !== optionalId) };
      }
      if (selectionType === "single") {
        return { ...prev, [groupId]: [optionalId] };
      }
      return { ...prev, [groupId]: [...current, optionalId] };
    });
  };

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
        <Loader2 className="w-8 h-8 animate-spin text-sp-primary" />
      </div>
    );
  }

  const totalValue = calculateTotal();
  const includedItems: { name: string }[] = (model.included_items || []).map((n: string) => ({ name: n }));

  return (
    <div className="container max-w-6xl mx-auto px-0 sm:px-2 py-2 sm:py-4 pb-32 lg:pb-8">
      <div className="mb-6 sp-animate-in">
        <span className="sp-eyebrow">Etapa 2 de 4</span>
        <h1 className="sp-h1 mt-2.5 mb-1">Personalize sua {model.name}</h1>
        <p className="sp-sub">Escolha os opcionais que combinam com o seu projeto.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-7 items-start">
        <div className="space-y-4">
          {/* Banner do modelo */}
          <div className="sp-card-elevated p-[18px] flex flex-col md:flex-row gap-[18px]">
            <div className="w-full md:w-[168px] h-[200px] md:h-[168px] rounded-sp-lg overflow-hidden bg-sp-muted flex-shrink-0">
              {model.photo_url ? (
                <img src={model.photo_url} alt={model.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Waves className="w-10 h-10 text-sp-muted-fg" /></div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="sp-pill sp-pill--primary self-start">Modelo escolhido</span>
              <h2 className="sp-display font-bold text-[26px] tracking-tight text-sp-fg leading-tight">{model.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-sp-muted-fg sp-tabular">
                {(model.length || model.width || model.depth) && (
                  <span className="inline-flex items-center gap-1.5"><Ruler className="w-3 h-3" />{model.length}×{model.width}×{model.depth}m</span>
                )}
                {model.delivery_days != null && <span className="inline-flex items-center gap-1.5"><Truck className="w-3 h-3" />{model.delivery_days}d entrega</span>}
                {model.installation_days != null && <span className="inline-flex items-center gap-1.5"><Wrench className="w-3 h-3" />{model.installation_days}d instalação</span>}
              </div>

              {includedItems.length > 0 && (
                <div className="border-t border-dashed border-sp-border pt-3 mt-1">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-sp-muted-fg mb-2">Já incluso na piscina</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {includedItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[12.5px] text-sp-fg">
                        <Check className="w-3 h-3 text-sp-primary mt-0.5 flex-shrink-0" strokeWidth={3} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grupos */}
          {groups.map((group) => {
            const groupOptionals = optionals.filter((o) => o.group_id === group.id).sort((a, b) => a.price - b.price);
            if (groupOptionals.length === 0) return null;
            const isSingle = getGroupType(group.id) === "single";

            return (
              <div key={group.id} className="sp-card p-5">
                <div className="flex items-center gap-3 border-b border-sp-border pb-3.5 mb-3.5">
                  <div className="w-[38px] h-[38px] rounded-sp bg-sp-primary-100 flex items-center justify-center text-sp-primary flex-shrink-0">
                    {groupIcon(group.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="sp-h3">{group.name}</h3>
                    {group.description && <p className="text-[12.5px] text-sp-muted-fg leading-snug">{group.description}</p>}
                  </div>
                  <span className="sp-pill">{isSingle ? 'Escolha 1' : 'Múltipla'}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {groupOptionals.map((opt) => {
                    const isSel = isSingle
                      ? selected[group.id]?.[0] === opt.id
                      : (selected[group.id]?.includes(opt.id) || false);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOptional(group.id, opt.id)}
                        className={`flex items-center gap-3.5 p-3.5 bg-sp-card border-[1.5px] rounded-sp-lg text-left transition-all duration-150 ${isSel ? 'border-sp-primary bg-sp-primary/5' : 'border-sp-border hover:border-sp-border-strong hover:bg-sp-muted/50'}`}
                      >
                        <span className={`sp-marker ${isSingle ? 'sp-marker--radio' : 'sp-marker--check'}`} data-checked={isSel}>
                          {isSel && <Check className="w-3 h-3" strokeWidth={3.5} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14.5px] font-semibold text-sp-fg">{opt.name}</div>
                          {opt.description && <div className="text-[12.5px] text-sp-muted-fg mt-0.5">{opt.description}</div>}
                        </div>
                        <div className="text-right flex-shrink-0 sp-tabular">
                          {opt.price === 0 ? (
                            <span className="sp-pill">Sem custo</span>
                          ) : (
                            <span className={`text-[14px] font-bold ${isSel ? 'text-sp-primary' : 'text-sp-fg'}`}>
                              {hidePricing ? <BlurredPrice value={opt.price} /> : `+ ${formatCurrency(opt.price)}`}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Model-specific optionals */}
          {modelOptionals.length > 0 && (
            <div className="sp-card p-5">
              <div className="flex items-center gap-3 border-b border-sp-border pb-3.5 mb-3.5">
                <div className="w-[38px] h-[38px] rounded-sp bg-sp-primary-100 flex items-center justify-center text-sp-primary flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="sp-h3">Opcionais Dimensionados</h3>
                  <p className="text-[12.5px] text-sp-muted-fg leading-snug">Calculados especificamente para {model.name}</p>
                </div>
                <span className="sp-pill">Múltipla</span>
              </div>
              <div className="flex flex-col gap-2">
                {modelOptionals.map((mOpt) => {
                  const isSel = selectedModelOpts.includes(mOpt.id);
                  return (
                    <button
                      key={mOpt.id}
                      type="button"
                      onClick={() => toggleModelOpt(mOpt.id)}
                      className={`flex items-center gap-3.5 p-3.5 bg-sp-card border-[1.5px] rounded-sp-lg text-left transition-all duration-150 ${isSel ? 'border-sp-primary bg-sp-primary/5' : 'border-sp-border hover:border-sp-border-strong hover:bg-sp-muted/50'}`}
                    >
                      <span className="sp-marker sp-marker--check" data-checked={isSel}>
                        {isSel && <Check className="w-3 h-3" strokeWidth={3.5} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-semibold text-sp-fg">{mOpt.name}</div>
                        {mOpt.description && <div className="text-[12.5px] text-sp-muted-fg mt-0.5">{mOpt.description}</div>}
                      </div>
                      <div className="text-right flex-shrink-0 sp-tabular">
                        <span className={`text-[14px] font-bold ${isSel ? 'text-sp-primary' : 'text-sp-fg'}`}>
                          {hidePricing ? <BlurredPrice value={mOpt.price} /> : `+ ${formatCurrency(mOpt.price)}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ASIDE desktop */}
        <aside className="hidden lg:block sticky top-[140px]">
          <div className="sp-card-elevated p-5">
            <div className="text-[11px] uppercase tracking-wider font-bold text-sp-muted-fg border-b border-sp-border pb-3 mb-3">
              Resumo do orçamento
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-sp-muted-fg">TOTAL</span>
              <span className="sp-display font-bold text-[22px] text-sp-primary sp-tabular">
                {hidePricing ? <BlurredPrice value={totalValue} /> : formatCurrency(totalValue)}
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-[11.5px] text-sp-muted-fg mb-4">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Valor estimado. Frete e instalação podem variar conforme a região.</span>
            </div>
            <button type="button" className="sp-btn sp-btn-primary w-full" onClick={handleContinue}>
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      </div>

      {/* Sticky bar mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-xl border-t border-sp-border px-4 py-3 z-40 flex justify-between items-center gap-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-sp-muted-fg">Total estimado</span>
          <span className="sp-display font-bold text-[20px] text-sp-primary sp-tabular truncate">
            {hidePricing ? <BlurredPrice value={totalValue} /> : formatCurrency(totalValue)}
          </span>
        </div>
        <button type="button" className="sp-btn sp-btn-primary shrink-0" onClick={handleContinue}>
          Continuar <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default OptionalsSelection;

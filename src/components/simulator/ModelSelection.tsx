import { useState, useMemo, useEffect } from "react";
import { Sparkles, Ruler, Droplet, Truck, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface ModelSelectionProps {
  models: PoolModel[];
  brands: Brand[];
  categories: Category[];
  onSelect: (model: PoolModel) => void;
  onBack: () => void;
}

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const ModelSelection = ({ models, brands, categories, onSelect }: ModelSelectionProps) => {
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [inclTotals, setInclTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = models.filter((m) => inclTotals[m.id] === undefined);
    if (missing.length === 0) return;
    (async () => {
      const results = await Promise.all(
        missing.map(async (m) => {
          const { data } = await supabase.rpc("get_model_included_items_total", { _model_id: m.id });
          return [m.id, Number(data) || 0] as const;
        })
      );
      if (cancelled) return;
      setInclTotals((prev) => {
        const next = { ...prev };
        results.forEach(([id, v]) => { next[id] = v; });
        return next;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  const filteredCategories = useMemo(() => {
    if (selectedBrand === "all") return categories;
    return categories.filter((c) => c.brand_id === selectedBrand);
  }, [categories, selectedBrand]);

  const filteredModels = useMemo(() => {
    let result = [...models];

    if (selectedCategory !== "all") {
      result = result.filter((m) => m.category_id === selectedCategory);
    } else if (selectedBrand !== "all") {
      const brandCategoryIds = categories
        .filter((c) => c.brand_id === selectedBrand)
        .map((c) => c.id);
      result = result.filter((m) => brandCategoryIds.includes(m.category_id));
    }

    switch (sortBy) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "price-asc":
        result.sort((a, b) => ((a.base_price || 0) + (inclTotals[a.id] || 0)) - ((b.base_price || 0) + (inclTotals[b.id] || 0)));
        break;
      case "price-desc":
        result.sort((a, b) => ((b.base_price || 0) + (inclTotals[b.id] || 0)) - ((a.base_price || 0) + (inclTotals[a.id] || 0)));
        break;
    }

    return result;
  }, [models, selectedBrand, selectedCategory, categories, sortBy, inclTotals]);

  const handleBrandChange = (value: string) => {
    setSelectedBrand(value);
    setSelectedCategory("all");
  };

  return (
    <div className="container max-w-6xl mx-auto px-0 sm:px-2 py-2 sm:py-4">
      <div className="mb-7 sp-animate-in">
        <span className="sp-eyebrow mb-3">Etapa 1 de 4</span>
        <h1 className="sp-h1 mt-2.5 mb-2">Escolha sua piscina</h1>
        <p className="sp-sub max-w-xl">
          Selecione o modelo que combina com seu espaço. Você poderá personalizar opcionais na próxima etapa.
        </p>
      </div>

      {/* FILTROS */}
      <div className="sp-card p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="sp-chip sp-chip--brand"
            data-active={selectedBrand === "all"}
            onClick={() => handleBrandChange("all")}
          >
            Todas
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              type="button"
              className="sp-chip sp-chip--brand"
              data-active={selectedBrand === b.id}
              onClick={() => handleBrandChange(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {filteredCategories.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-sp-muted-fg font-semibold">
                Categoria
              </span>
              <select
                className="sp-select sp-btn-sm w-[160px]"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-sp-muted-fg font-semibold">
              Ordenar
            </span>
            <select
              className="sp-select sp-btn-sm w-[180px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Nome (A–Z)</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </div>
        </div>
      </div>

      <p className="text-[13px] text-sp-muted-fg mb-3.5">
        {filteredModels.length} modelo{filteredModels.length !== 1 ? "s" : ""} disponíve{filteredModels.length !== 1 ? "is" : "l"}
      </p>

      {filteredModels.length === 0 ? (
        <div className="sp-card p-8 text-center">
          <p className="text-sp-muted-fg text-sm">
            Nenhum modelo encontrado com os filtros selecionados.
          </p>
          <button
            type="button"
            className="sp-btn sp-btn-ghost sp-btn-sm mt-3"
            onClick={() => {
              setSelectedBrand("all");
              setSelectedCategory("all");
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {filteredModels.map((model, index) => {
            const cat = categories.find((c) => c.id === model.category_id);
            const brand = cat ? brands.find((b) => b.id === cat.brand_id) : null;

            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model)}
                className="sp-card-interactive group flex flex-col text-left overflow-hidden cursor-pointer sp-animate-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-sp-muted">
                  {model.photo_url ? (
                    <img
                      src={model.photo_url}
                      alt={model.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.06]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <Waves className="w-12 h-12 text-sp-muted-fg" />
                    </div>
                  )}
                  {brand?.name && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-sp-primary backdrop-blur shadow">
                      <Sparkles className="w-3 h-3" />
                      {brand.name}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 px-4 pt-8 pb-3.5 bg-gradient-to-t from-slate-900/85 to-transparent flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[12px] font-semibold">Ver detalhes →</span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="sp-display font-bold text-[19px] tracking-tight text-sp-fg truncate">
                        {model.name}
                      </h3>
                      {cat && <p className="text-[12px] text-sp-muted-fg">{cat.name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-sp-muted-fg font-semibold uppercase tracking-wider">
                        A partir de
                      </div>
                      <div className="sp-display font-bold text-[19px] text-sp-primary sp-tabular">
                        {formatCurrency((model.base_price || 0) + (inclTotals[model.id] || 0))}
                      </div>
                    </div>
                  </div>

                  {(model.length || model.width || model.depth) && (
                    <div className="flex flex-wrap gap-3.5 px-3 py-2.5 bg-sp-muted rounded-sp text-[12px] text-sp-muted-fg sp-tabular">
                      <span className="inline-flex items-center gap-1.5">
                        <Ruler className="w-3 h-3" />
                        {model.length}×{model.width}×{model.depth}m
                      </span>
                      {model.length && model.width && (
                        <span className="inline-flex items-center gap-1.5">
                          <Droplet className="w-3 h-3" />
                          {(model.length * model.width).toFixed(1)}m²
                        </span>
                      )}
                      {model.delivery_days != null && (
                        <span className="inline-flex items-center gap-1.5">
                          <Truck className="w-3 h-3" />
                          {model.delivery_days}d entrega
                        </span>
                      )}
                    </div>
                  )}

                  {model.differentials?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {model.differentials.slice(0, 2).map((d, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-sp-muted text-sp-muted-fg border border-sp-border font-medium"
                        >
                          {d}
                        </span>
                      ))}
                      {model.differentials.length > 2 && (
                        <span className="text-[11px] px-2 py-1 text-sp-muted-fg font-medium">
                          +{model.differentials.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelection;

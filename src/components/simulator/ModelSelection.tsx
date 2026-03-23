import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

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

const ModelSelection = ({ models, brands, categories, onSelect, onBack }: ModelSelectionProps) => {
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter categories by selected brand
  const filteredCategories = useMemo(() => {
    if (selectedBrand === "all") return categories;
    return categories.filter((c) => c.brand_id === selectedBrand);
  }, [categories, selectedBrand]);

  // Filter models
  const filteredModels = useMemo(() => {
    let result = models;

    if (selectedCategory !== "all") {
      result = result.filter((m) => m.category_id === selectedCategory);
    } else if (selectedBrand !== "all") {
      const brandCategoryIds = categories
        .filter((c) => c.brand_id === selectedBrand)
        .map((c) => c.id);
      result = result.filter((m) => brandCategoryIds.includes(m.category_id));
    }

    return result;
  }, [models, selectedBrand, selectedCategory, categories]);

  const handleBrandChange = (value: string) => {
    setSelectedBrand(value);
    setSelectedCategory("all");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">Escolha o Modelo</h2>
        <p className="text-muted-foreground">Selecione o modelo perfeito para seu projeto</p>
      </div>

      {/* Filters */}
      {(brands.length > 0 || categories.length > 0) && (
        <Card className="p-4 mb-6 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {brands.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Marca</label>
                <Select value={selectedBrand} onValueChange={handleBrandChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Marcas</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {filteredCategories.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(selectedBrand !== "all" || selectedCategory !== "all") && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {filteredModels.length} modelo{filteredModels.length !== 1 ? "s" : ""} encontrado{filteredModels.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => { setSelectedBrand("all"); setSelectedCategory("all"); }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <Card className="p-8 text-center bg-card/80 backdrop-blur-sm">
          <p className="text-muted-foreground">Nenhum modelo encontrado com os filtros selecionados</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => { setSelectedBrand("all"); setSelectedCategory("all"); }}
          >
            Limpar filtros
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => {
            // Find category & brand name for display
            const cat = categories.find((c) => c.id === model.category_id);
            const brand = cat ? brands.find((b) => b.id === cat.brand_id) : null;

            return (
              <Card
                key={model.id}
                className="overflow-hidden hover:shadow-elegant transition-all cursor-pointer group bg-card/80 backdrop-blur-sm"
                onClick={() => onSelect(model)}
              >
                {model.photo_url && (
                  <div className="aspect-square overflow-hidden bg-white p-4">
                    <img
                      src={model.photo_url}
                      alt={model.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-lg font-bold">{model.name}</h3>
                  </div>
                  {(brand || cat) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {brand && <Badge variant="outline" className="text-[10px]">{brand.name}</Badge>}
                      {cat && <Badge variant="secondary" className="text-[10px]">{cat.name}</Badge>}
                    </div>
                  )}
                  {(model.length || model.width || model.depth) && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {model.length}m x {model.width}m x {model.depth}m
                    </p>
                  )}
                  {model.differentials.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {model.differentials.slice(0, 2).map((diff, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">{diff}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span>Entrega: {model.delivery_days}d</span>
                    <span>Instalação: {model.installation_days}d</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelection;

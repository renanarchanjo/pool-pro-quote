import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Search, Store, MapPin, Calendar, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { exportPDF } from "@/lib/exportPDF";

interface StoreRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  slug: string;
  created_at: string | null;
}

const brazilStates = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const StoresManager = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [filtered, setFiltered] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, filterState, filterCity, dateFrom, dateTo, stores]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, city, state, slug, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Error loading stores:", error);
      toast.error("Erro ao carregar lojas");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...stores];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.state?.toLowerCase().includes(q)
      );
    }

    if (filterState) {
      result = result.filter((s) => s.state === filterState);
    }

    if (filterCity.trim()) {
      const c = filterCity.toLowerCase();
      result = result.filter((s) => s.city?.toLowerCase().includes(c));
    }

    if (dateFrom) {
      result = result.filter((s) => s.created_at && s.created_at >= dateFrom);
    }

    if (dateTo) {
      const endDate = dateTo + "T23:59:59";
      result = result.filter((s) => s.created_at && s.created_at <= endDate);
    }

    setFiltered(result);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterState("");
    setFilterCity("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = filterState || filterCity || dateFrom || dateTo;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    toast.info("Gerando relatório...");
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `relatorio-lojas-${new Date().toISOString().split("T")[0]}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(reportRef.current)
        .save();
      toast.success("Relatório exportado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueCities = [...new Set(stores.map((s) => s.city).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-7 h-7 text-primary" />
            Lojas Cadastradas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} loja{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? "border-primary text-primary" : ""}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtros
            {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{[filterState, filterCity, dateFrom, dateTo].filter(Boolean).length}</Badge>}
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Relatório PDF
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, cidade ou estado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filtros avançados</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                  <X className="w-3 h-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Estado</Label>
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {brazilStates.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input
                  className="h-9"
                  placeholder="Filtrar cidade..."
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Data de</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Data até</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Lojas</p>
            <p className="text-2xl font-bold">{stores.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Estados</p>
            <p className="text-2xl font-bold">{new Set(stores.map((s) => s.state).filter(Boolean)).size}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Cidades</p>
            <p className="text-2xl font-bold">{uniqueCities.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Store list */}
      <div ref={reportRef}>
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search || hasActiveFilters ? "Nenhuma loja encontrada com esses filtros" : "Nenhuma loja cadastrada ainda"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <Card key={s.id} className="border-border/50 hover:shadow-card transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{s.name}</h3>
                        {s.state && (
                          <Badge variant="secondary" className="text-xs">{s.state}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        {s.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {s.city}{s.state ? ` - ${s.state}` : ""}
                          </span>
                        )}
                        {s.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(s.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoresManager;

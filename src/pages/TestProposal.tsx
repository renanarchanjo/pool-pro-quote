import { useMemo, useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, FileText, Calculator, BookOpen, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

// ============ TYPES ============
type PoolType = "vinil" | "alvenaria";

interface Area {
  id: string;
  comprimento: number;
  largura: number;
  profundidade: number;
}

interface Item {
  id: string;
  qtde: number;
  descricao: string;
  unidade: string;
  unitario: number;
  markup: number;
}

interface Group {
  id: string;
  titulo: string;
  optional?: boolean;
  enabled?: boolean;
  items: Item[];
}

interface Parcela {
  id: string;
  nome: string;
  percentual: number;
  descricao: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

// ============ FILTRO DIMENSIONADO (auto, baseado no m² do fundo) ============
function getConjuntoFiltrante(m2Fundo: number, tipo: PoolType) {
  let desc = "";
  let preco = 0;
  if (m2Fundo <= 20) {
    desc = "Conjunto filtrante: Filtro 40 + Bomba 1/2 cv";
    preco = tipo === "vinil" ? 2890 : 3290;
  } else if (m2Fundo <= 32) {
    desc = "Conjunto filtrante: Filtro 50 + Bomba 3/4 cv";
    preco = tipo === "vinil" ? 3490 : 3990;
  } else if (m2Fundo <= 45) {
    desc = "Conjunto filtrante: Filtro 60 + Bomba 1,0 cv";
    preco = tipo === "vinil" ? 4290 : 4890;
  } else {
    desc = "Conjunto filtrante: Filtro 70 + Bomba 1,5 cv";
    preco = tipo === "vinil" ? 5290 : 5990;
  }
  return { desc, preco };
}

const NAO_INCLUSOS_VINIL = [
  "Retirada de terras e/ou entulhos",
  "Materiais para alvenaria, hidráulicos e elétricos",
  "Calçada ao redor da piscina e acabamentos em geral",
  "Energia até a casa de máquinas",
  "Ligação pluvial a partir da casa de máquinas",
  "Água para encher a piscina",
  "Tampa para casa de máquinas",
  "Abertura/fechamento de muros para entrada de bob cat",
  "Aluguéis de caçamba, munks, guindaste, andaimes, etc.",
];
const NAO_INCLUSOS_ALV = [
  "Escavação, retirada de terras e/ou entulhos",
  "Material civil (madeiras, ferragens, areia, pedra, cimento, blocos, impermeabilizantes)",
  "Material hidráulico e elétrico para execução",
  "Calçada ao redor da piscina",
  "Energia até a casa de máquinas",
  "Água para encher a piscina",
  "Aluguéis de equipamentos",
];

// ============ CATÁLOGO COM FÓRMULAS DE DIMENSIONAMENTO ============
type Formula =
  | "fixed"
  | "m2_fundo"
  | "m2_paredes"
  | "m2_bruto"
  | "m2_vinil"        // bruto × 1.2 (+20%)
  | "m2_imperm"       // bruto × 1.1 (+10%)
  | "m2_revestimento"; // bruto × 1.2 (+20%)

const FORMULA_LABELS: Record<Formula, string> = {
  fixed: "Fixo",
  m2_fundo: "× M² Fundo",
  m2_paredes: "× M² Paredes",
  m2_bruto: "× M² Bruto",
  m2_vinil: "× M² Vinil (+20%)",
  m2_imperm: "× M² Imperm. (+10%)",
  m2_revestimento: "× M² Revest. (+20%)",
};

type GroupKind = "base" | "opcional";

interface CatalogItem {
  id: string;
  descricao: string;
  unidade: string;
  unitario: number;
  formula: Formula;
  fator: number;          // multiplicador (ou qtde direta quando formula = 'fixed')
  markupPadrao: number;
}
interface CatalogGroup {
  id: string;
  titulo: string;
  kind: GroupKind;        // base = sempre incluso · opcional = recomendação
  items: CatalogItem[];
}
type CatalogData = { vinil: CatalogGroup[]; alvenaria: CatalogGroup[] };

const CATALOG_KEY = "test-proposal-catalog-v2";

function computeQtde(item: CatalogItem, calc: { m2Fundo: number; m2Paredes: number; m2Bruto: number; m2Vinil: number; m2Imperm: number }): number {
  const base = {
    fixed: 1,
    m2_fundo: calc.m2Fundo,
    m2_paredes: calc.m2Paredes,
    m2_bruto: calc.m2Bruto,
    m2_vinil: calc.m2Vinil,
    m2_imperm: calc.m2Imperm,
    m2_revestimento: calc.m2Vinil,
  }[item.formula];
  return +(base * item.fator).toFixed(2);
}

const DEFAULT_CATALOG: CatalogData = {
  vinil: [
    { id: uid(), titulo: "Estrutura e Escavação", kind: "base", items: [
      { id: uid(), descricao: "Escavação de primeira linha com bob cat", unidade: "un", unitario: 300, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "M² de construção estrutural incluindo casa de máquinas", unidade: "m²", unitario: 600, formula: "m2_fundo", fator: 1, markupPadrao: 0 },
    ]},
    { id: uid(), titulo: "Vinil e Hidráulica", kind: "base", items: [
      { id: uid(), descricao: "M² de vinil 1.5mm", unidade: "m²", unitario: 165, formula: "m2_vinil", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Mão de obra para instalação do vinil", unidade: "m²", unitario: 60, formula: "m2_bruto", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Dispositivo de aspiração", unidade: "un", unitario: 78, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Dispositivo de retorno", unidade: "un", unitario: 78, formula: "fixed", fator: 2, markupPadrao: 0 },
      { id: uid(), descricao: "Ralo de parede", unidade: "un", unitario: 78, formula: "fixed", fator: 2, markupPadrao: 0 },
      { id: uid(), descricao: "Sacos de areia especial para filtragem", unidade: "un", unitario: 30, formula: "fixed", fator: 8, markupPadrao: 0 },
      { id: uid(), descricao: "Mão de obra instalação hidráulica casa de máquinas", unidade: "un", unitario: 825, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Kit limpeza (aspirador, mangueira, escova, conectores)", unidade: "un", unitario: 330, formula: "fixed", fator: 1, markupPadrao: 0 },
    ]},
    { id: uid(), titulo: "Iluminação", kind: "opcional", items: [
      { id: uid(), descricao: "Refletor LED 12v 9w RGB", unidade: "un", unitario: 230, formula: "fixed", fator: 5, markupPadrao: 0 },
      { id: uid(), descricao: "Caixa de passagem para LED", unidade: "un", unitario: 38, formula: "fixed", fator: 5, markupPadrao: 0 },
      { id: uid(), descricao: "Cabo PP 4 vias", unidade: "mt", unitario: 9, formula: "fixed", fator: 50, markupPadrao: 0 },
      { id: uid(), descricao: "Central de comando com fonte e controle remoto", unidade: "un", unitario: 730, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Mão de obra para instalação de LEDs", unidade: "un", unitario: 280, formula: "fixed", fator: 5, markupPadrao: 0 },
    ]},
    { id: uid(), titulo: "Cascata", kind: "opcional", items: [
      { id: uid(), descricao: "Cascata de embutir inox 304 - 100cm", unidade: "un", unitario: 1350, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Bomba para cascata motor WEG 1/2 cv", unidade: "un", unitario: 1272, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Mão de obra para instalação da cascata", unidade: "un", unitario: 300, formula: "fixed", fator: 1, markupPadrao: 0 },
    ]},
  ],
  alvenaria: [
    { id: uid(), titulo: "Estrutura e Escavação", kind: "base", items: [
      { id: uid(), descricao: "M² Construção estrutural própria para piscina", unidade: "m²", unitario: 1200, formula: "m2_fundo", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Ligação hidráulica piscina ↔ casa de máquinas", unidade: "un", unitario: 900, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Deslocamento/acompanhamento", unidade: "un", unitario: 3000, formula: "fixed", fator: 1, markupPadrao: 0 },
    ]},
    { id: uid(), titulo: "Impermeabilização e Revestimento", kind: "base", items: [
      { id: uid(), descricao: "M² de impermeabilização especial para piscina", unidade: "m²", unitario: 48, formula: "m2_imperm", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "M² de assentamento e rejuntamento do revestimento", unidade: "m²", unitario: 90, formula: "m2_revestimento", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Tampa em alumínio fundido 80x80cm", unidade: "un", unitario: 2499, formula: "fixed", fator: 1, markupPadrao: 0 },
    ]},
    { id: uid(), titulo: "Hidráulica", kind: "base", items: [
      { id: uid(), descricao: "Dispositivo de aspiração inox 304", unidade: "un", unitario: 84, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Dispositivo de retorno inox 304", unidade: "un", unitario: 84, formula: "fixed", fator: 2, markupPadrao: 0 },
      { id: uid(), descricao: "Dispositivo de sucção inox 304", unidade: "un", unitario: 84, formula: "fixed", fator: 2, markupPadrao: 0 },
      { id: uid(), descricao: "Sacos de areia especial para filtro", unidade: "un", unitario: 30, formula: "fixed", fator: 4, markupPadrao: 0 },
      { id: uid(), descricao: "Instalação hidráulica na casa de máquinas", unidade: "un", unitario: 675, formula: "fixed", fator: 1, markupPadrao: 0 },
    ]},
    { id: uid(), titulo: "Aquecimento / Trocador de Calor", kind: "opcional", items: [
      { id: uid(), descricao: "Trocador de calor KOBC 75mil Btus", unidade: "un", unitario: 18750, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Bomba 3/4 cv motor WEG para aquecimento", unidade: "un", unitario: 1317, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Capa térmica azul 300mc", unidade: "m²", unitario: 22.5, formula: "m2_fundo", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Instalação hidráulica e elétrica do trocador", unidade: "un", unitario: 1200, formula: "fixed", fator: 1, markupPadrao: 0 },
      { id: uid(), descricao: "Infraestrutura casa de máquinas-trocador", unidade: "un", unitario: 600, formula: "fixed", fator: 1, markupPadrao: 0 },
    ]},
  ],
};

function loadCatalog(): CatalogData {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_CATALOG;
}

// ============ BUILD GROUPS FROM CATALOG ============
function buildFromCatalog(
  catGroups: CatalogGroup[],
  calc: { m2Fundo: number; m2Paredes: number; m2Bruto: number; m2Vinil: number; m2Imperm: number },
  conj: { desc: string; preco: number },
): Group[] {
  const generated: Group[] = catGroups.map((cg) => ({
    id: uid(),
    titulo: cg.titulo,
    optional: cg.kind === "opcional",
    enabled: cg.kind === "base",
    items: cg.items.map((ci) => ({
      id: uid(),
      qtde: computeQtde(ci, calc),
      descricao: ci.descricao,
      unidade: ci.unidade,
      unitario: ci.unitario,
      markup: ci.markupPadrao,
    })),
  }));

  // grupo auto-dimensionado do conjunto filtrante (sempre incluso)
  generated.push({
    id: uid(),
    titulo: "Conjunto Filtrante (dimensionado automaticamente)",
    items: [
      { id: uid(), qtde: 1, descricao: conj.desc, unidade: "un", unitario: conj.preco, markup: 0 },
    ],
  });

  return generated;
}

// ============ MAIN ============
export default function TestProposal() {
  useForceLightTheme();
  const [view, setView] = useState<"proposta" | "catalogo">("proposta");
  const [catalog, setCatalog] = useState<CatalogData>(() => loadCatalog());
  useEffect(() => {
    try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); } catch {}
  }, [catalog]);

  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<PoolType>("vinil");
  const [areas, setAreas] = useState<Area[]>([
    { id: uid(), comprimento: 8, largura: 4, profundidade: 1.4 },
  ]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [naoInclusos, setNaoInclusos] = useState<string[]>(NAO_INCLUSOS_VINIL);

  // dados etapa 3
  const today = new Date().toISOString().slice(0, 10);
  const plus3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const [cliente, setCliente] = useState({
    nome: "",
    endereco: "",
    gestor: "",
    data: today,
    validade: plus3,
    descricao: "",
    inicio: "30 dias após assinatura",
    execucao: "60 dias",
    garEstrutura: "5 anos",
    garEquipamentos: "1 ano (conforme fabricante)",
    garInstalacoes: "3 meses",
    banco: "Mercado Pago",
    cnpj: "",
    empresa: "Sua Empresa de Piscinas",
  });
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  // ============ CÁLCULOS ============
  const calc = useMemo(() => {
    const m2Fundo = areas.reduce((s, a) => s + a.comprimento * a.largura, 0);
    const m2Paredes = areas.reduce(
      (s, a) => s + (a.comprimento + a.largura) * 2 * a.profundidade,
      0,
    );
    const m2Bruto = m2Fundo + m2Paredes;
    const m2Vinil = +(m2Bruto * 1.2).toFixed(2); // +20%
    const m2Imperm = +(m2Bruto * 1.1).toFixed(2); // +10%
    return { m2Fundo: +m2Fundo.toFixed(2), m2Paredes: +m2Paredes.toFixed(2), m2Bruto: +m2Bruto.toFixed(2), m2Vinil, m2Imperm };
  }, [areas]);

  const conj = useMemo(() => getConjuntoFiltrante(calc.m2Fundo, tipo), [calc.m2Fundo, tipo]);

  // recalcula grupos ao mudar tipo / dimensionamento (etapa 1 → 2) — direto do catálogo
  const goToStep2 = useCallback(() => {
    const g = buildFromCatalog(catalog[tipo], calc, conj);
    setGroups(g);
    setNaoInclusos(tipo === "vinil" ? NAO_INCLUSOS_VINIL : NAO_INCLUSOS_ALV);
    setStep(2);
  }, [tipo, catalog, calc, conj]);

  const goToStep3 = useCallback(() => {
    if (parcelas.length === 0) {
      setParcelas(
        tipo === "vinil"
          ? [
              { id: uid(), nome: "Entrada", percentual: 40, descricao: "Na assinatura do contrato" },
              { id: uid(), nome: "2ª parcela", percentual: 30, descricao: "Após 15 dias do início da obra" },
              { id: uid(), nome: "Final", percentual: 30, descricao: "Na finalização e entrega" },
            ]
          : [
              { id: uid(), nome: "Aprovação", percentual: 5, descricao: "Na aprovação do projeto" },
              { id: uid(), nome: "Radié", percentual: 35, descricao: "Na execução do radié" },
              { id: uid(), nome: "Reboco", percentual: 30, descricao: "Após reboco da estrutura" },
              { id: uid(), nome: "Conclusão", percentual: 30, descricao: "Na entrega da obra" },
            ],
      );
    }
    setStep(3);
  }, [tipo, parcelas.length]);

  // totais
  const itemTotal = (i: Item) => i.qtde * i.unitario * (1 + i.markup / 100);
  const groupTotal = (g: Group) =>
    g.optional && !g.enabled ? 0 : g.items.reduce((s, i) => s + itemTotal(i), 0);
  const totalGeral = groups.reduce((s, g) => s + groupTotal(g), 0);
  const totalParcelas = parcelas.reduce((s, p) => s + p.percentual, 0);

  // ============ HANDLERS AREAS ============
  const addArea = () => setAreas([...areas, { id: uid(), comprimento: 0, largura: 0, profundidade: 0 }]);
  const removeArea = (id: string) => areas.length > 1 && setAreas(areas.filter((a) => a.id !== id));
  const updateArea = (id: string, k: keyof Area, v: number) =>
    setAreas(areas.map((a) => (a.id === id ? { ...a, [k]: v } : a)));

  // ============ HANDLERS GROUPS/ITEMS ============
  const updateItem = (gid: string, iid: string, patch: Partial<Item>) =>
    setGroups(groups.map((g) => (g.id === gid ? { ...g, items: g.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) } : g)));
  const removeItem = (gid: string, iid: string) =>
    setGroups(groups.map((g) => (g.id === gid ? { ...g, items: g.items.filter((i) => i.id !== iid) } : g)));
  const addItem = (gid: string) =>
    setGroups(
      groups.map((g) =>
        g.id === gid
          ? { ...g, items: [...g.items, { id: uid(), qtde: 1, descricao: "Novo item", unidade: "un", unitario: 0, markup: 0 }] }
          : g,
      ),
    );
  const toggleGroup = (gid: string) =>
    setGroups(groups.map((g) => (g.id === gid ? { ...g, enabled: !g.enabled } : g)));
  const addGroup = () =>
    setGroups([...groups, { id: uid(), titulo: "Novo Grupo", items: [] }]);
  const updateGroupTitle = (gid: string, titulo: string) =>
    setGroups(groups.map((g) => (g.id === gid ? { ...g, titulo } : g)));
  const removeGroup = (gid: string) => setGroups(groups.filter((g) => g.id !== gid));

  // Importar item do catálogo para um grupo da proposta (qtde já dimensionada)
  const importFromCatalog = (gid: string, catItem: CatalogItem) =>
    setGroups(groups.map((g) => g.id === gid ? { ...g, items: [...g.items, {
      id: uid(),
      qtde: computeQtde(catItem, calc),
      descricao: catItem.descricao,
      unidade: catItem.unidade,
      unitario: catItem.unitario,
      markup: catItem.markupPadrao,
    }] } : g));

  // ============ CATÁLOGO HANDLERS ============
  const catList = catalog[tipo];
  const setCatList = (groups: CatalogGroup[]) => setCatalog({ ...catalog, [tipo]: groups });
  const catAddGroup = () => setCatList([...catList, { id: uid(), titulo: "Novo grupo", kind: "opcional", items: [] }]);
  const catRemoveGroup = (gid: string) => setCatList(catList.filter((g) => g.id !== gid));
  const catUpdateGroupTitle = (gid: string, titulo: string) =>
    setCatList(catList.map((g) => (g.id === gid ? { ...g, titulo } : g)));
  const catUpdateGroupKind = (gid: string, kind: GroupKind) =>
    setCatList(catList.map((g) => (g.id === gid ? { ...g, kind } : g)));
  const catAddItem = (gid: string) =>
    setCatList(catList.map((g) => g.id === gid ? { ...g, items: [...g.items, { id: uid(), descricao: "Novo item", unidade: "un", unitario: 0, formula: "fixed", fator: 1, markupPadrao: 0 }] } : g));
  const catUpdateItem = (gid: string, iid: string, patch: Partial<CatalogItem>) =>
    setCatList(catList.map((g) => g.id === gid ? { ...g, items: g.items.map((i) => i.id === iid ? { ...i, ...patch } : i) } : g));
  const catRemoveItem = (gid: string, iid: string) =>
    setCatList(catList.map((g) => g.id === gid ? { ...g, items: g.items.filter((i) => i.id !== iid) } : g));
  const catResetDefaults = () => {
    if (confirm("Restaurar catálogo padrão deste tipo? Suas alterações serão perdidas.")) {
      setCatalog({ ...catalog, [tipo]: DEFAULT_CATALOG[tipo] });
    }
  };
  const catExport = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-piscinas-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============ PARCELAS ============
  const addParcela = () =>
    setParcelas([...parcelas, { id: uid(), nome: "Parcela", percentual: 0, descricao: "" }]);
  const updateParcela = (id: string, k: keyof Parcela, v: string | number) =>
    setParcelas(parcelas.map((p) => (p.id === id ? { ...p, [k]: v } : p)));
  const removeParcela = (id: string) => setParcelas(parcelas.filter((p) => p.id !== id));

  // ============ NÃO INCLUSOS ============
  const updateNaoIncluso = (idx: number, v: string) =>
    setNaoInclusos(naoInclusos.map((x, i) => (i === idx ? v : x)));
  const removeNaoIncluso = (idx: number) => setNaoInclusos(naoInclusos.filter((_, i) => i !== idx));
  const addNaoIncluso = () => setNaoInclusos([...naoInclusos, ""]);

  // ============ PDF / PRINT ============
  const gerarPDF = () => {
    const html = buildProposalHTML({
      tipo,
      cliente,
      areas,
      calc,
      groups,
      naoInclusos,
      parcelas,
      totalGeral,
    });
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#1a5276] text-white py-5 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Gerador de Proposta — Teste (Vinil & Alvenaria)</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white/10 rounded-lg p-1 border border-white/20">
              <button
                onClick={() => setView("proposta")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${view === "proposta" ? "bg-white text-[#1a5276]" : "text-white/80 hover:text-white"}`}
              >
                <FileText className="w-3.5 h-3.5" /> Proposta
              </button>
              <button
                onClick={() => setView("catalogo")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${view === "catalogo" ? "bg-white text-[#1a5276]" : "text-white/80 hover:text-white"}`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Catálogo
              </button>
            </div>
          </div>
        </div>
      </header>

      {view === "proposta" && (
      <>
      {/* Stepper */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-3 mb-6">
          {[
            { n: 1, label: "Tipo e Dimensionamento" },
            { n: 2, label: "Itens da Proposta" },
            { n: 3, label: "Cliente e Condições" },
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center gap-3 flex-1">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 flex-1 transition-all ${
                  step === s.n
                    ? "bg-[#1a5276] text-white border-[#1a5276]"
                    : step > s.n
                    ? "bg-cyan-50 text-[#1a5276] border-cyan-300"
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s.n ? "bg-white/20" : "bg-slate-100"
                  }`}
                >
                  {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                </div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {idx < 2 && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 pb-12">
        {step === 1 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Tipo de Piscina</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { v: "vinil" as const, t: "Vinil Tela Armada", d: "Estrutura + vinil 1.5mm" },
                  { v: "alvenaria" as const, t: "Alvenaria (Pastilha/Cerâmica)", d: "Estrutura + revestimento cerâmico" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setTipo(o.v)}
                    className={`text-left p-5 rounded-xl border-2 transition-all ${
                      tipo === o.v
                        ? "border-[#1a5276] bg-cyan-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-base">{o.t}</div>
                    <div className="text-sm text-slate-500 mt-1">{o.d}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Áreas da Piscina</h2>
                <Button onClick={addArea} size="sm" className="bg-[#1a5276] hover:bg-[#154360]">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Área
                </Button>
              </div>
              <div className="space-y-3">
                {areas.map((a, idx) => {
                  const isPrainha = a.profundidade > 0 && a.profundidade < 0.6;
                  return (
                    <div key={a.id} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-lg border">
                      <div className="col-span-12 md:col-span-2">
                        <Label className="text-xs">Área {idx + 1}</Label>
                        <div
                          className={`mt-1 text-xs font-medium px-2 py-1 rounded inline-block ${
                            isPrainha ? "bg-cyan-100 text-cyan-800" : a.profundidade >= 0.6 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {a.profundidade === 0 ? "—" : isPrainha ? "Prainha" : "Área Funda"}
                        </div>
                      </div>
                      <div className="col-span-4 md:col-span-3">
                        <Label className="text-xs">Comprimento (m)</Label>
                        <Input type="number" step="0.01" value={a.comprimento || ""} onChange={(e) => updateArea(a.id, "comprimento", +e.target.value)} />
                      </div>
                      <div className="col-span-4 md:col-span-3">
                        <Label className="text-xs">Largura (m)</Label>
                        <Input type="number" step="0.01" value={a.largura || ""} onChange={(e) => updateArea(a.id, "largura", +e.target.value)} />
                      </div>
                      <div className="col-span-4 md:col-span-3">
                        <Label className="text-xs">Profundidade (m)</Label>
                        <Input type="number" step="0.01" value={a.profundidade || ""} onChange={(e) => updateArea(a.id, "profundidade", +e.target.value)} />
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removeArea(a.id)} disabled={areas.length === 1}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-[#1a5276] to-[#0f3a5c] text-white">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Resumo Calculado</h2>
                <span className="ml-auto text-xs bg-green-400/20 text-green-100 px-2 py-1 rounded border border-green-300/30">
                  ✓ Calculado automaticamente
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric label="M² Fundo" value={`${calc.m2Fundo} m²`} />
                <Metric label={tipo === "vinil" ? "M² Vinil (+20%)" : "M² Cerâmica (+20%)"} value={`${calc.m2Vinil} m²`} />
                {tipo === "alvenaria" && <Metric label="M² Impermeab. (+10%)" value={`${calc.m2Imperm} m²`} />}
                <Metric label="Conjunto Filtrante" value={conj.desc.replace("Conjunto filtrante: ", "")} small />
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-sm">
                <strong>Dispositivos hidráulicos:</strong> 1 Aspiração · 2 Retornos · 2 Ralos de Parede
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={goToStep2} size="lg" className="bg-[#1a5276] hover:bg-[#154360]">
                Próximo: Revisar Itens <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {groups.map((g) => (
              <Card key={g.id} className="overflow-hidden">
                <div className="bg-[#1a5276] text-white px-5 py-3 flex items-center justify-between">
                  <input
                    value={g.titulo}
                    onChange={(e) => updateGroupTitle(g.id, e.target.value)}
                    className="bg-transparent font-semibold outline-none border-b border-transparent focus:border-white/40 flex-1"
                  />
                  <div className="flex items-center gap-4">
                    {g.optional && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>Incluir</span>
                        <Switch checked={!!g.enabled} onCheckedChange={() => toggleGroup(g.id)} />
                      </div>
                    )}
                    <span className="text-sm font-mono">{brl(groupTotal(g))}</span>
                    <button onClick={() => removeGroup(g.id)} className="text-white/70 hover:text-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {(!g.optional || g.enabled) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left w-20">Qtde</th>
                          <th className="px-3 py-2 text-left w-16">Un.</th>
                          <th className="px-3 py-2 text-left">Descrição</th>
                          <th className="px-3 py-2 text-right w-28">Unitário</th>
                          <th className="px-3 py-2 text-right w-24">Markup %</th>
                          <th className="px-3 py-2 text-right w-32">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((i, idx) => (
                          <tr key={i.id} className={idx % 2 ? "bg-slate-50/50" : ""}>
                            <td className="px-3 py-1">
                              <Input className="h-8" type="number" step="0.01" value={i.qtde} onChange={(e) => updateItem(g.id, i.id, { qtde: +e.target.value })} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8" value={i.unidade} onChange={(e) => updateItem(g.id, i.id, { unidade: e.target.value })} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8" value={i.descricao} onChange={(e) => updateItem(g.id, i.id, { descricao: e.target.value })} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8 text-right" type="number" step="0.01" value={i.unitario} onChange={(e) => updateItem(g.id, i.id, { unitario: +e.target.value })} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8 text-right" type="number" step="0.01" value={i.markup} onChange={(e) => updateItem(g.id, i.id, { markup: +e.target.value })} />
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium">{brl(itemTotal(i))}</td>
                            <td className="px-1">
                              <button onClick={() => removeItem(g.id, i.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-slate-50 border-t flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => addItem(g.id)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item
                      </Button>
                      <select
                        value=""
                        onChange={(e) => {
                          const [catGid, catIid] = e.target.value.split("|");
                          const cg = catList.find((x) => x.id === catGid);
                          const ci = cg?.items.find((x) => x.id === catIid);
                          if (ci) importFromCatalog(g.id, ci);
                          e.target.value = "";
                        }}
                        className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-700 hover:border-slate-300 max-w-[280px]"
                      >
                        <option value="">📚 Importar do catálogo…</option>
                        {catList.map((cg) => (
                          <optgroup key={cg.id} label={cg.titulo}>
                            {cg.items.map((ci) => (
                              <option key={ci.id} value={`${cg.id}|${ci.id}`}>
                                {ci.descricao} — {brl(ci.unitario)}/{ci.unidade}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </Card>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={addGroup}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar grupo
              </Button>
              <Card className="px-6 py-3 bg-slate-900 text-white">
                <div className="text-xs uppercase text-slate-300">Total Geral</div>
                <div className="text-2xl font-bold font-mono">{brl(totalGeral)}</div>
              </Card>
            </div>

            {/* Não inclusos */}
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Itens NÃO inclusos na proposta</h3>
              <div className="space-y-2">
                {naoInclusos.map((n, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={n} onChange={(e) => updateNaoIncluso(idx, e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => removeNaoIncluso(idx)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addNaoIncluso}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button onClick={goToStep3} size="lg" className="bg-[#1a5276] hover:bg-[#154360]">
                Próximo: Cliente e Condições <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Dados do Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome do cliente" value={cliente.nome} onChange={(v) => setCliente({ ...cliente, nome: v })} />
                <Field label="Endereço" value={cliente.endereco} onChange={(v) => setCliente({ ...cliente, endereco: v })} />
                <Field label="Empresa" value={cliente.empresa} onChange={(v) => setCliente({ ...cliente, empresa: v })} />
                <Field label="Gestor comercial" value={cliente.gestor} onChange={(v) => setCliente({ ...cliente, gestor: v })} />
                <Field label="Data" type="date" value={cliente.data} onChange={(v) => setCliente({ ...cliente, data: v })} />
                <Field label="Validade" type="date" value={cliente.validade} onChange={(v) => setCliente({ ...cliente, validade: v })} />
              </div>
              <div className="mt-4">
                <Label>Descrição do projeto</Label>
                <Textarea value={cliente.descricao} onChange={(e) => setCliente({ ...cliente, descricao: e.target.value })} placeholder="Ex: Piscina 8x5x1,40 + prainha 4x2x0,50" />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Prazos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Início da obra" value={cliente.inicio} onChange={(v) => setCliente({ ...cliente, inicio: v })} />
                <Field label="Prazo de execução" value={cliente.execucao} onChange={(v) => setCliente({ ...cliente, execucao: v })} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Garantias</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Estrutura" value={cliente.garEstrutura} onChange={(v) => setCliente({ ...cliente, garEstrutura: v })} />
                <Field label="Equipamentos" value={cliente.garEquipamentos} onChange={(v) => setCliente({ ...cliente, garEquipamentos: v })} />
                <Field label="Instalações" value={cliente.garInstalacoes} onChange={(v) => setCliente({ ...cliente, garInstalacoes: v })} />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Condições de Pagamento</h2>
                <div
                  className={`text-sm font-mono px-3 py-1 rounded ${
                    totalParcelas === 100 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  Total: {totalParcelas}% {totalParcelas === 100 ? "✓" : "(deve fechar 100%)"}
                </div>
              </div>
              <div className="space-y-2">
                {parcelas.map((p) => (
                  <div key={p.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">Nome</Label>
                      <Input value={p.nome} onChange={(e) => updateParcela(p.id, "nome", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">%</Label>
                      <Input type="number" step="0.01" value={p.percentual} onChange={(e) => updateParcela(p.id, "percentual", +e.target.value)} />
                    </div>
                    <div className="col-span-6">
                      <Label className="text-xs">Momento / descrição</Label>
                      <Input value={p.descricao} onChange={(e) => updateParcela(p.id, "descricao", e.target.value)} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeParcela(p.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addParcela}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar parcela
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Dados Bancários</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Banco / Plataforma" value={cliente.banco} onChange={(v) => setCliente({ ...cliente, banco: v })} />
                <Field label="CNPJ" value={cliente.cnpj} onChange={(v) => setCliente({ ...cliente, cnpj: v })} />
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button onClick={gerarPDF} size="lg" className="bg-[#1a5276] hover:bg-[#154360]">
                <FileText className="w-4 h-4 mr-2" /> Visualizar / Gerar PDF
              </Button>
            </div>
          </div>
        )}
      </main>
      </>
      )}

      {view === "catalogo" && (
        <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <h2 className="text-lg font-semibold">Catálogo de Itens</h2>
                <p className="text-sm text-slate-500">Cadastre e mantenha os preços atualizados. Salvamento automático.</p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                {(["vinil", "alvenaria"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tipo === t ? "bg-[#1a5276] text-white" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {t === "vinil" ? "Vinil" : "Alvenaria"}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={catExport}>
                <Download className="w-4 h-4 mr-1" /> Exportar JSON
              </Button>
              <Button variant="outline" size="sm" onClick={catResetDefaults}>
                Restaurar padrão
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5 w-fit">
              <Save className="w-3.5 h-3.5" /> Salvo automaticamente no navegador
            </div>
          </Card>

          {catList.map((g) => (
            <Card key={g.id} className="overflow-hidden">
              <div className="bg-[#1a5276] text-white px-5 py-3 flex items-center justify-between gap-3">
                <input
                  value={g.titulo}
                  onChange={(e) => catUpdateGroupTitle(g.id, e.target.value)}
                  className="bg-transparent font-semibold outline-none border-b border-transparent focus:border-white/40 flex-1"
                />
                <span className="text-xs text-white/70">{g.items.length} {g.items.length === 1 ? "item" : "itens"}</span>
                <button onClick={() => catRemoveGroup(g.id)} className="text-white/70 hover:text-white">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-left w-20">Un.</th>
                      <th className="px-3 py-2 text-right w-28">Unitário</th>
                      <th className="px-3 py-2 text-right w-24">Qtde Padrão</th>
                      <th className="px-3 py-2 text-right w-24">Markup %</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((i, idx) => (
                      <tr key={i.id} className={idx % 2 ? "bg-slate-50/50" : ""}>
                        <td className="px-3 py-1">
                          <Input className="h-8" value={i.descricao} onChange={(e) => catUpdateItem(g.id, i.id, { descricao: e.target.value })} />
                        </td>
                        <td className="px-3 py-1">
                          <Input className="h-8" value={i.unidade} onChange={(e) => catUpdateItem(g.id, i.id, { unidade: e.target.value })} />
                        </td>
                        <td className="px-3 py-1">
                          <Input className="h-8 text-right" type="number" step="0.01" value={i.unitario} onChange={(e) => catUpdateItem(g.id, i.id, { unitario: +e.target.value })} />
                        </td>
                        <td className="px-3 py-1">
                          <Input className="h-8 text-right" type="number" step="0.01" value={i.qtdePadrao} onChange={(e) => catUpdateItem(g.id, i.id, { qtdePadrao: +e.target.value })} />
                        </td>
                        <td className="px-3 py-1">
                          <Input className="h-8 text-right" type="number" step="0.01" value={i.markupPadrao} onChange={(e) => catUpdateItem(g.id, i.id, { markupPadrao: +e.target.value })} />
                        </td>
                        <td className="px-1">
                          <button onClick={() => catRemoveItem(g.id, i.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {g.items.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-slate-400">Nenhum item — adicione abaixo.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="px-3 py-2 bg-slate-50 border-t">
                  <Button variant="ghost" size="sm" onClick={() => catAddItem(g.id)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <div>
            <Button variant="outline" onClick={catAddGroup}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar grupo
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}

// ============ HELPERS UI ============
function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-xs text-cyan-200 uppercase tracking-wide">{label}</div>
      <div className={`font-bold ${small ? "text-sm mt-1" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ============ PROPOSAL HTML BUILDER ============
function buildProposalHTML(data: {
  tipo: PoolType;
  cliente: any;
  areas: Area[];
  calc: any;
  groups: Group[];
  naoInclusos: string[];
  parcelas: Parcela[];
  totalGeral: number;
}) {
  const { tipo, cliente, groups, naoInclusos, parcelas, totalGeral } = data;
  const itemTotal = (i: Item) => i.qtde * i.unitario * (1 + i.markup / 100);
  const groupTotal = (g: Group) =>
    g.optional && !g.enabled ? 0 : g.items.reduce((s, i) => s + itemTotal(i), 0);

  const formatDate = (d: string) => {
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
    } catch {
      return d;
    }
  };

  const groupsHtml = groups
    .filter((g) => !g.optional || g.enabled)
    .map(
      (g) => `
    <div class="group">
      <div class="group-header">${g.titulo}</div>
      <table>
        <thead>
          <tr><th>Qtde</th><th>Un.</th><th>Descrição</th><th class="r">Unitário</th><th class="r">Total</th></tr>
        </thead>
        <tbody>
          ${g.items
            .map(
              (i) => `
            <tr>
              <td>${i.qtde}</td>
              <td>${i.unidade}</td>
              <td>${i.descricao}</td>
              <td class="r">${brl(i.unitario * (1 + i.markup / 100))}</td>
              <td class="r">${brl(itemTotal(i))}</td>
            </tr>`,
            )
            .join("")}
          <tr class="subtotal"><td colspan="4" class="r"><strong>Subtotal ${g.titulo}</strong></td><td class="r"><strong>${brl(groupTotal(g))}</strong></td></tr>
        </tbody>
      </table>
    </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Proposta — ${cliente.nome || "Cliente"}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; background: #f1f5f9; }
  .page { max-width: 800px; margin: 24px auto; background: white; padding: 40px; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
  .top { border-bottom: 4px solid #1a5276; padding-bottom: 18px; margin-bottom: 24px; }
  .top h1 { color: #1a5276; margin: 0 0 4px; font-size: 24px; }
  .top .sub { color: #64748b; font-size: 13px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 24px 0; font-size: 13px; }
  .meta div b { color: #1a5276; }
  h2 { color: #1a5276; font-size: 16px; border-left: 4px solid #00bcd4; padding-left: 10px; margin: 28px 0 12px; }
  .group { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .group-header { background: #1a5276; color: white; padding: 8px 12px; font-weight: 600; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 10px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
  td.r, th.r { text-align: right; }
  tr.subtotal td { background: #f8fafc; padding: 8px 10px; }
  .total-box { background: #1a5276; color: white; padding: 16px 20px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
  .total-box .label { font-size: 13px; opacity: .85; }
  .total-box .val { font-size: 24px; font-weight: 700; }
  ul.nao-inc { font-size: 12px; columns: 2; column-gap: 24px; color: #475569; }
  ul.nao-inc li { margin-bottom: 4px; break-inside: avoid; }
  .pmt-table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .pmt-table th, .pmt-table td { padding: 6px 10px; border: 1px solid #e2e8f0; }
  .pmt-table th { background: #f1f5f9; }
  .gar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px; }
  .gar div { background: #f1f5f9; padding: 10px; border-radius: 6px; border-left: 3px solid #00bcd4; }
  .sign { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 12px; text-align: center; }
  .sign .line { border-top: 1px solid #1f2937; padding-top: 6px; }
  .actions { max-width: 800px; margin: 0 auto 24px; display: flex; justify-content: flex-end; gap: 8px; }
  .actions button { background: #1a5276; color: white; border: 0; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
  @media print { .actions { display: none; } body { background: white; } .page { box-shadow: none; margin: 0; max-width: 100%; } }
</style>
</head><body>
<div class="actions"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<div class="page">
  <div class="top">
    <h1>${cliente.empresa || "Proposta Comercial"}</h1>
    <div class="sub">Proposta de Construção de Piscina — ${tipo === "vinil" ? "Vinil Tela Armada" : "Alvenaria (Pastilha/Cerâmica)"}</div>
  </div>

  <div class="meta">
    <div><b>Cliente:</b> ${cliente.nome || "—"}</div>
    <div><b>Data:</b> ${formatDate(cliente.data)}</div>
    <div><b>Endereço:</b> ${cliente.endereco || "—"}</div>
    <div><b>Validade:</b> ${formatDate(cliente.validade)}</div>
    <div><b>Gestor comercial:</b> ${cliente.gestor || "—"}</div>
    <div><b>Projeto:</b> ${cliente.descricao || "—"}</div>
  </div>

  <h2>Escopo da Proposta</h2>
  ${groupsHtml}

  <div class="total-box">
    <span class="label">VALOR TOTAL DA PROPOSTA</span>
    <span class="val">${brl(totalGeral)}</span>
  </div>

  <h2>Itens NÃO inclusos</h2>
  <ul class="nao-inc">${naoInclusos.map((n) => `<li>${n}</li>`).join("")}</ul>

  <h2>Prazos</h2>
  <div style="font-size:13px;">
    <p><b>Início da obra:</b> ${cliente.inicio}</p>
    <p><b>Prazo de execução:</b> ${cliente.execucao}</p>
  </div>

  <h2>Garantias</h2>
  <div class="gar">
    <div><b>Estrutura</b><br/>${cliente.garEstrutura}</div>
    <div><b>Equipamentos</b><br/>${cliente.garEquipamentos}</div>
    <div><b>Instalações</b><br/>${cliente.garInstalacoes}</div>
  </div>

  <h2>Condições de Pagamento</h2>
  <table class="pmt-table">
    <thead><tr><th>Parcela</th><th>%</th><th>Valor</th><th>Momento</th></tr></thead>
    <tbody>
      ${parcelas
        .map(
          (p) => `<tr><td>${p.nome}</td><td>${p.percentual}%</td><td>${brl((totalGeral * p.percentual) / 100)}</td><td>${p.descricao}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>

  <h2>Dados Bancários</h2>
  <div style="font-size:13px;">
    <p><b>Banco / Plataforma:</b> ${cliente.banco}</p>
    <p><b>CNPJ:</b> ${cliente.cnpj || "—"}</p>
  </div>

  <div class="sign">
    <div class="line">Cliente — ${cliente.nome || ""}</div>
    <div class="line">${cliente.empresa || "Empresa"}</div>
  </div>
</div>
</body></html>`;
}

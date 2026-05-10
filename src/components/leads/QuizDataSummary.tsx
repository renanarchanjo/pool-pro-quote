import { Badge } from "@/components/ui/badge";
import { Ruler, Layers, Sparkles, Clock, MessageSquare, Waves } from "lucide-react";

interface Area {
  tipo: "funda" | "prainha" | "spa" | "espelho";
  comp?: number;
  larg?: number;
  prof?: number;
}

interface QuizData {
  tipo_piscina?: string | null;
  areas?: Area[];
  opcionais?: string[];
  prazo?: string;
  observacoes?: string;
}

interface Props {
  quizData: QuizData | null | undefined;
  leadType?: string | null;
  className?: string;
}

const TIPO_PISCINA_LABEL: Record<string, string> = {
  alvenaria: "Alvenaria (sob medida)",
  vinil: "Vinil tela armada",
  fibra: "Fibra",
  construcao: "Construção",
};

const AREA_LABEL: Record<string, string> = {
  funda: "Área principal",
  prainha: "Prainha",
  spa: "Spa / Hidromassagem",
  espelho: "Espelho d'água",
};

const OPCIONAL_LABEL: Record<string, string> = {
  iluminacao: "Iluminação LED",
  cascata: "Cascata",
  aquecimento_solar: "Aquecimento Solar",
  trocador_calor: "Trocador de Calor",
  hidromassagem: "Hidromassagem",
  gerador_cloro_salino: "Gerador de Cloro Salino",
  gerador_ozonio: "Gerador de Ozônio",
};

const PRAZO_LABEL: Record<string, string> = {
  "3_meses": "Próximos 3 meses",
  "3_6_meses": "Entre 3 e 6 meses",
  "6_meses_mais": "Mais de 6 meses",
  pesquisando: "Ainda pesquisando",
};

const fmtNum = (v?: number) => (typeof v === "number" && v > 0 ? v.toString().replace(".", ",") : "—");

const QuizDataSummary = ({ quizData, leadType, className }: Props) => {
  if (!quizData || typeof quizData !== "object") {
    return (
      <div className={`rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground ${className || ""}`}>
        Este lead não possui respostas de quiz registradas.
      </div>
    );
  }

  const tipo = quizData.tipo_piscina || leadType || "";
  const areas = Array.isArray(quizData.areas) ? quizData.areas : [];
  const opcionais = Array.isArray(quizData.opcionais) ? quizData.opcionais : [];

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Tipo */}
      {tipo && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
          <Waves className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tipo de piscina</p>
            <p className="text-sm font-semibold text-foreground">{TIPO_PISCINA_LABEL[tipo] || tipo}</p>
          </div>
        </div>
      )}

      {/* Áreas */}
      {areas.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Dimensões</p>
          </div>
          <div className="space-y-1.5">
            {areas.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5">
                <span className="text-sm font-medium">{AREA_LABEL[a.tipo] || a.tipo}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {fmtNum(a.comp)} × {fmtNum(a.larg)} × {fmtNum(a.prof)} m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opcionais */}
      {opcionais.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Itens desejados</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {opcionais.map((o, i) => (
              <Badge key={i} variant="secondary" className="text-[11px]">
                {OPCIONAL_LABEL[o] || o}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Prazo */}
      {quizData.prazo && (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Prazo:</p>
          <span className="text-sm font-medium">{PRAZO_LABEL[quizData.prazo] || quizData.prazo}</span>
        </div>
      )}

      {/* Observações */}
      {quizData.observacoes && quizData.observacoes.trim().length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Observações</p>
          </div>
          <p className="text-sm whitespace-pre-wrap rounded-md bg-muted/40 border border-border px-2.5 py-1.5">
            {quizData.observacoes}
          </p>
        </div>
      )}

      {areas.length === 0 && opcionais.length === 0 && !quizData.prazo && !quizData.observacoes && (
        <p className="text-xs text-muted-foreground italic">Nenhum detalhe adicional informado.</p>
      )}
    </div>
  );
};

export default QuizDataSummary;

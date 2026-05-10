import { lazy, Suspense, useState, useCallback } from "react";
import {
  Loader2,
  ArrowRight,
  Waves,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Plus,
  FileText,
  Settings2,
  Quote,
} from "lucide-react";
import PageSEO from "@/components/PageSEO";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const PoolSimulator = lazy(() => import("@/components/simulator/PoolSimulator"));

const SimulatorLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Carregando simulador">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const Index = () => {
  useForceLightTheme();
  const [showSimulator, setShowSimulator] = useState(false);
  const handleSimulate = useCallback(() => setShowSimulator(true), []);
  const handleBack = useCallback(() => setShowSimulator(false), []);

  if (showSimulator) {
    return (
      <Suspense fallback={<SimulatorLoader />}>
        <PoolSimulator onBack={handleBack} />
      </Suspense>
    );
  }

  const onCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSimulate();
  };

  return (
    <div className="min-h-screen bg-sp-bg text-sp-fg">
      <PageSEO
        title="SIMULAPOOL - Simulador de Piscinas de Fibra"
        description="Descubra o preço da sua piscina de fibra em menos de 1 minuto. Simulador gratuito com orçamento detalhado na hora. 100% online."
        path="/"
      />

      {/* ==================== HEADER ==================== */}
      <header className="sticky top-0 z-50 bg-sp-bg/85 backdrop-blur-md border-b border-sp-border">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7 h-[68px] flex items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-sp bg-sp-fg flex items-center justify-center overflow-hidden">
              <Waves className="w-[18px] h-[18px] text-sp-bg relative z-10" />
              <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-transparent to-sp-primary opacity-85" />
            </div>
            <div className="leading-tight">
              <div className="sp-display font-extrabold text-[17px] tracking-tight">SimulaPool</div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-sp-muted-fg">Orçamento em minutos</div>
            </div>
          </a>
          <nav className="flex items-center gap-1">
            <a href="#como-funciona" className="hidden md:inline-flex h-10 px-3.5 items-center text-[14px] text-sp-muted-fg hover:text-sp-fg hover:bg-sp-muted/60 rounded-sp transition">Como funciona</a>
            <a href="#modelos" className="hidden md:inline-flex h-10 px-3.5 items-center text-[14px] text-sp-muted-fg hover:text-sp-fg hover:bg-sp-muted/60 rounded-sp transition">Modelos</a>
            <a href="/parceiros" className="hidden md:inline-flex h-10 px-3.5 items-center text-[14px] text-sp-muted-fg hover:text-sp-fg hover:bg-sp-muted/60 rounded-sp transition">Para fábricas</a>
            <a href="/login" className="inline-flex h-10 px-3.5 items-center text-[14px] text-sp-muted-fg hover:text-sp-fg rounded-sp transition mr-1.5">Entrar</a>
            <button onClick={handleSimulate} className="sp-btn sp-btn-dark">
              Simular <span className="w-7 h-7 rounded-full bg-sp-primary text-white flex items-center justify-center"><ArrowRight className="w-3.5 h-3.5" /></span>
            </button>
          </nav>
        </div>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7 pt-12 sm:pt-16 pb-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-end">
          <div className="sp-animate-in">
            <div className="inline-flex items-center gap-2.5 bg-white border border-sp-border rounded-full px-3.5 py-2 shadow-sm mb-7">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-sp-primary animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-sp-primary" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-sp-fg">Simulação ao vivo · sem cadastro</span>
            </div>

            <h1
              className="sp-display font-extrabold leading-[0.98] tracking-tight text-balance"
              style={{ fontSize: "clamp(44px, 6.6vw, 96px)" }}
            >
              <span>Preço da sua piscina,</span>{" "}
              <span className="text-sp-primary relative inline-block whitespace-nowrap">
                em menos de 1 minuto
                <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -left-[2%] -bottom-[0.18em] w-[104%] overflow-visible">
                  <path d="M3 9 Q 50 3, 100 6 T 197 7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-[520px] text-[clamp(16px,1.4vw,19px)] leading-relaxed text-sp-muted-fg">
              Configure modelo, tamanho e opcionais. Receba o PDF completo no WhatsApp. Sem vendedor, sem cadastro inicial.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button onClick={handleSimulate} className="sp-btn sp-btn-dark sp-btn-lg">
                Calcular preço agora
                <span className="w-9 h-9 rounded-full bg-sp-primary text-white flex items-center justify-center"><ArrowRight className="w-4 h-4" /></span>
              </button>
              <a href="#como-funciona" className="sp-btn sp-btn-outline sp-btn-lg">Ver como funciona</a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-sp-muted-fg">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sp-primary" /> Sem cadastro inicial</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-sp-primary" /> PDF na hora</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-sp-primary" /> Tabela oficial das fábricas</span>
            </div>
          </div>

          {/* Figura */}
          <div
            className="relative aspect-[4/5] rounded-[32px] overflow-hidden shadow-sp-elegant bg-sp-muted sp-animate-in"
            style={{ animationDelay: "120ms" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(11,18,32,0.04) 0 14px, transparent 14px 28px), linear-gradient(180deg, #C9DEEC 0%, #98C4DD 55%, #6FA8C8 100%)",
              }}
            />
            <div
              className="absolute inset-[18%_12%_22%_14%] rounded-[220px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_30px_50px_-20px_rgba(7,17,31,0.35)]"
              style={{
                backgroundImage:
                  "radial-gradient(60% 50% at 30% 30%, rgba(255,255,255,0.55), transparent 65%), linear-gradient(180deg, #1FA7E0 0%, #0E5C8A 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-[18%_12%_22%_14%] rounded-[220px] mix-blend-screen blur-[6px] opacity-90 animate-caustic"
              style={{
                backgroundImage:
                  "radial-gradient(50% 30% at 30% 30%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(40% 25% at 70% 60%, rgba(255,255,255,0.3), transparent 60%)",
                animationDuration: "9s",
                animationIterationCount: "infinite",
                animationDirection: "alternate",
                animationTimingFunction: "ease-in-out",
              }}
            />
            <span className="absolute left-5 top-5 z-20 font-mono text-[10.5px] uppercase tracking-[0.16em] bg-white/95 text-sp-fg px-2.5 py-1.5 rounded-md shadow-sm">[ photo · piscina vinil 4.80 × 8.00m ]</span>

            {/* Card flutuante */}
            <div
              className="absolute -left-7 bottom-9 z-30 w-[280px] max-w-[75%] bg-white border border-sp-border rounded-[18px] shadow-sp-elegant p-4 -rotate-3 animate-float"
              style={{
                animationDuration: "6s",
                animationIterationCount: "infinite",
                animationDirection: "alternate",
                animationTimingFunction: "ease-in-out",
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="sp-pill sp-pill--primary">Proposta</span>
                <span className="sp-display font-bold text-[13px]">Modelo Atlântico</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-sp-muted-fg">Tamanho</span>
                <span className="sp-display font-bold">4,80 × 8,00m</span>
              </div>
              <div className="flex justify-between items-center text-[13px] mt-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-sp-muted-fg">Revestimento</span>
                <span className="sp-display font-bold">Vinil premium</span>
              </div>
              <hr className="my-3 border-sp-border" />
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-sp-muted-fg">Total estimado</div>
                  <div className="sp-display font-extrabold text-[26px] tracking-tight text-sp-primary sp-tabular">R$ 38.500</div>
                </div>
                <span className="sp-pill sp-pill--success">Pronto</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logos strip */}
        <div className="container max-w-7xl mx-auto px-5 sm:px-7">
          <div className="border-y border-sp-border py-5 grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-7">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sp-muted-fg max-w-[180px] leading-snug">Fábricas parceiras com tabela de preço integrada</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-md flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.14em] text-sp-muted-fg"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(11,18,32,0.06) 0 6px, transparent 6px 12px)" }}
                >
                  [ marca 0{i} ]
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section id="como-funciona" className="py-20 sm:py-24">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7">
          <div className="max-w-2xl mb-12">
            <span className="sp-eyebrow">Como funciona</span>
            <h2 className="sp-h1 mt-3" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
              3 passos. Sem ligação. <span className="text-sp-primary">Sem espera.</span>
            </h2>
            <p className="sp-sub mt-4 max-w-xl">Você configura, vê o preço, recebe o PDF. Se quiser fechar, a fábrica te procura — não o contrário.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: "Etapa 01", t: "1. Escolha o modelo", d: "Filtre por tamanho, formato e orçamento. Veja todos os modelos com tabela de preço aberta.", icon: Plus, ph: "[ wireframe · grid de modelos ]" },
              { n: "Etapa 02", t: "2. Configure os opcionais", d: "Cada item ajusta o preço em tempo real. Você vê exatamente o que paga por cada coisa, sem caixa-preta.", icon: Settings2, ph: "[ wireframe · configurador de opcionais ]" },
              { n: "Etapa 03", t: "3. Receba o PDF", d: "Proposta detalhada no e-mail e WhatsApp. A fábrica mais próxima é notificada. Você decide se quer continuar.", icon: FileText, ph: "[ wireframe · proposta em PDF ]" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.t} className="sp-card-interactive p-7 sp-animate-in" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex items-center gap-2.5 mb-7">
                    <span className="w-5 h-5 rounded-full bg-sp-primary/15 border border-sp-primary inline-block" />
                    <span className="sp-display font-bold text-[14px] text-sp-primary tracking-wider">{s.n}</span>
                  </div>
                  <h3 className="sp-display font-bold text-[22px] tracking-tight mb-2">{s.t}</h3>
                  <p className="text-[15px] leading-relaxed text-sp-muted-fg">{s.d}</p>
                  <div
                    className="mt-6 aspect-[4/3] rounded-sp-lg flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.14em] text-sp-muted-fg text-center px-3"
                    style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(11,18,32,0.05) 0 10px, transparent 10px 20px)", backgroundColor: "hsl(var(--sp-muted))" }}
                  >
                    <Icon className="w-4 h-4 mr-2" /> {s.ph}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== MODELOS ==================== */}
      <section id="modelos" className="pb-20 sm:pb-24">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7">
          <div className="max-w-2xl mb-10">
            <span className="sp-eyebrow">Catálogo</span>
            <h2 className="sp-h1 mt-3" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
              Catálogo aberto. <span className="text-sp-primary">Preços visíveis.</span>
            </h2>
            <p className="sp-sub mt-4 max-w-xl">Tabelas oficiais das fábricas parceiras. Filtre, compare, simule — sem precisar pedir orçamento.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex flex-wrap gap-1.5">
              {["Todos", "Compactas", "Médias", "Grandes", "Spa & Hidro"].map((c, i) => (
                <button key={c} className="sp-chip" data-active={i === 0}>{c}</button>
              ))}
            </div>
            <button onClick={handleSimulate} className="sp-btn sp-btn-ghost sp-btn-sm">Ver todos os modelos <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Modelo Pacífico", cat: "Compacta · Vinil", dim: "3,50 × 6,00m", depth: "1,40m", price: "24.900", extras: [] as string[], grad: "linear-gradient(180deg,#B9D6E6 0%, #79A9C5 100%)" },
              { name: "Modelo Atlântico", cat: "Média · Vinil premium", dim: "4,80 × 8,00m", depth: "1,50m", price: "38.500", extras: ["Prainha"], grad: "linear-gradient(180deg,#A6CCDD 0%, #5E92B0 100%)" },
              { name: "Modelo Mediterrâneo", cat: "Grande · Alvenaria", dim: "6,00 × 12,00m", depth: "1,80m", price: "78.900", extras: ["Spa"], grad: "linear-gradient(180deg,#9DC4D9 0%, #4A7E9E 100%)" },
            ].map((m) => (
              <article key={m.name} className="sp-card-interactive overflow-hidden flex flex-col">
                <div
                  className="aspect-[4/3] relative flex items-end p-3.5"
                  style={{ backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 12px, transparent 12px 24px), ${m.grad}` }}
                >
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] bg-white/95 text-sp-fg px-2 py-1 rounded">[ foto · {m.dim.toLowerCase()} ]</span>
                </div>
                <div className="p-5">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-sp-muted-fg mb-1.5">{m.cat}</div>
                  <h4 className="sp-display font-bold text-[19px] tracking-tight">{m.name}</h4>
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5 text-[12.5px] text-sp-muted-fg">
                    <span><b className="text-sp-fg font-semibold">{m.dim}</b></span>
                    <span><b className="text-sp-fg font-semibold">{m.depth}</b> prof.</span>
                    {m.extras.map((e) => (
                      <span key={e}><b className="text-sp-fg font-semibold">{e}</b></span>
                    ))}
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-dashed border-sp-border flex items-end justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sp-muted-fg">A partir de</div>
                      <div className="sp-display font-bold text-[22px] tracking-tight sp-tabular">
                        <span className="font-mono font-medium text-[10px] tracking-wide text-sp-muted-fg mr-1">R$</span>
                        {m.price}
                      </div>
                    </div>
                    <button onClick={onCtaClick} className="sp-btn sp-btn-primary sp-btn-sm">Simular <ArrowRight className="w-3 h-3" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== BLOCO ESCURO ==================== */}
      <section id="rede" className="mx-3 sm:mx-7 mb-20 sm:mb-24 relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-[#07111F] text-white py-20 sm:py-24">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-[10%] -right-[5%] w-[720px] h-[720px] rounded-full"
            style={{ background: "radial-gradient(closest-side, hsl(199 89% 48% / 0.45), transparent 72%)", filter: "blur(10px)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              WebkitMaskImage: "radial-gradient(ellipse at top right, black 0%, transparent 70%)",
              maskImage: "radial-gradient(ellipse at top right, black 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="relative container max-w-7xl mx-auto px-5 sm:px-7">
          <span className="sp-eyebrow text-white/55">Por trás do simulador</span>
          <h2
            className="sp-display font-extrabold mt-3 max-w-4xl tracking-tight leading-[1.04] text-balance"
            style={{ fontSize: "clamp(32px, 4.4vw, 60px)" }}
          >
            180 fábricas. <span className="italic font-bold text-sp-primary">1 simulador.</span> Preço transparente.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-white/70 max-w-xl">Sem atravessador, sem markup escondido. SimulaPool conecta direto à fábrica autorizada da sua região com a tabela oficial.</p>

          <div className="mt-14 pt-9 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-7">
            {[
              { v: "4.800+", l: "Simulações por mês" },
              { v: "180", l: "Lojas parceiras" },
              { v: "<1min", l: "Tempo médio" },
              { v: "32%", l: "Taxa de conversão" },
            ].map((s) => (
              <div key={s.l}>
                <div className="sp-display font-extrabold text-white tracking-tight leading-none sp-tabular" style={{ fontSize: "clamp(36px, 4.4vw, 56px)" }}>
                  <span className="text-sp-primary">{s.v}</span>
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60 mt-2.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== DEPOIMENTOS ==================== */}
      <section className="pb-20 sm:pb-24">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7">
          <div className="max-w-2xl mb-12">
            <span className="sp-eyebrow">Quem usou conta</span>
            <h2 className="sp-h1 mt-3" style={{ fontSize: "clamp(28px, 3.6vw, 46px)" }}>
              Quem comprou pelo simulador <span className="text-sp-primary">conta.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { p: "Pedi orçamento de manhã, recebi o PDF antes do almoço. Comparei com outras duas marcas e fechei na mesma semana. Foi a coisa mais fácil que fiz no projeto da casa.", n: "Renata M.", m: "Campinas · piscina entregue em 2026", a: "RM" },
              { p: "Eu ia desistir da piscina depois que três vendedores sumiram. No SimulaPool eu fiz tudo no celular, vi o preço de cinco modelos diferentes e escolhi com calma.", n: "João F.", m: "Goiânia · piscina entregue em 2025", a: "JF" },
              { p: "O simulador deu o valor certinho — quando a fábrica veio com o orçamento oficial, bateu na vírgula. Senti que tava no controle do começo ao fim.", n: "Carla A.", m: "Florianópolis · piscina entregue em 2026", a: "CA" },
            ].map((q) => (
              <article key={q.n} className="sp-card p-7 flex flex-col">
                <Quote className="w-7 h-7 text-sp-primary mb-3" />
                <p className="text-[16px] leading-relaxed flex-1 text-pretty">{q.p}</p>
                <div className="mt-5 pt-4 border-t border-sp-border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sp-muted flex items-center justify-center sp-display font-bold text-[13px] text-sp-muted-fg">{q.a}</div>
                  <div className="leading-tight">
                    <b className="sp-display font-bold text-[13.5px]">{q.n}</b>
                    <div className="text-[12px] text-sp-muted-fg mt-0.5">{q.m}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="pb-20 sm:pb-24">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7 grid lg:grid-cols-[1fr_1.4fr] gap-14">
          <div>
            <span className="sp-eyebrow">Dúvidas frequentes</span>
            <h2
              className="sp-display font-extrabold mt-3 leading-[1.05] tracking-tight text-balance"
              style={{ fontSize: "clamp(28px, 3.4vw, 44px)" }}
            >
              Perguntas diretas, <span className="text-sp-primary">respostas diretas.</span>
            </h2>
            <p className="sp-sub mt-4">
              Não respondeu o que você precisa?{" "}
              <a href="mailto:simulapool@gmail.com" className="text-sp-primary font-semibold hover:underline underline-offset-4">Fale com a gente</a>.
            </p>
          </div>
          <div className="divide-y divide-sp-border border-y border-sp-border">
            {[
              { q: "O simulador é gratuito mesmo?", a: "Sim — gratuito e sem compromisso. Você simula, recebe o PDF, e só fala com a fábrica se quiser ir adiante. Sem pegadinha." },
              { q: "O preço do simulador é o preço final?", a: "É um orçamento estimado, calculado com tabelas oficiais das fábricas parceiras. Em ~95% dos casos o preço bate na vírgula. Pequenas variações podem ocorrer dependendo do solo e logística da sua cidade." },
              { q: "Quanto tempo leva pra construir uma piscina?", a: "De 30 a 90 dias, dependendo do modelo e tamanho. Vinil é mais rápido (até 30 dias), alvenaria leva mais. O prazo exato vem na proposta da fábrica." },
              { q: "Vocês atendem a minha cidade?", a: "Temos 180 lojas parceiras em todas as regiões do Brasil. Quando você simula, mostramos automaticamente a fábrica/lojista mais próxima da sua cidade." },
              { q: "E se eu quiser personalizar algo que não está no simulador?", a: "Sem problema. A simulação serve como ponto de partida — quando a fábrica entrar em contato, você combina personalizações específicas direto com o time técnico." },
              { q: "Sou fabricante. Como entro pra rede?", a: "Veja a página /parceiros. Onboarding em 7 dias, sem mensalidade pra começar." },
            ].map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-6 sp-display font-semibold text-[18px] tracking-tight leading-snug">
                  <span>{item.q}</span>
                  <span className="w-7 h-7 shrink-0 rounded-full bg-sp-muted flex items-center justify-center transition-all group-open:rotate-45 group-open:bg-sp-primary group-open:text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-sp-muted-fg max-w-[80%] text-pretty">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section
        className="mx-3 sm:mx-7 mb-24 rounded-[28px] sm:rounded-[36px] py-20 sm:py-24 text-center relative overflow-hidden"
        style={{ background: "radial-gradient(60% 60% at 70% 40%, hsl(199 89% 48% / 0.18), transparent 70%), hsl(var(--sp-muted))" }}
      >
        <div className="container max-w-4xl mx-auto px-5 sm:px-7 relative">
          <h2 className="sp-display font-extrabold leading-[1.0] tracking-tight text-balance" style={{ fontSize: "clamp(32px, 5vw, 64px)" }}>
            Pare de pedir orçamento. <span className="italic font-bold text-sp-primary">Calcule.</span>
          </h2>
          <p className="mt-6 max-w-lg mx-auto text-[17px] leading-relaxed text-sp-muted-fg">Grátis. Online. Resultado em menos de 1 minuto.</p>
          <button onClick={handleSimulate} className="sp-btn sp-btn-dark sp-btn-lg mt-8">
            Calcular agora
            <span className="w-9 h-9 rounded-full bg-sp-primary text-white flex items-center justify-center"><ArrowRight className="w-4 h-4" /></span>
          </button>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-sp-fg text-white/70 pt-16 pb-7">
        <div className="container max-w-7xl mx-auto px-5 sm:px-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-9 gap-x-9 pb-12 border-b border-white/10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-sp bg-white/10 flex items-center justify-center"><Waves className="w-[18px] h-[18px] text-sp-primary" /></div>
                <div className="leading-tight">
                  <div className="sp-display font-extrabold text-[17px] text-white">SimulaPool</div>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/50">Brasil · {new Date().getFullYear()}</div>
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed max-w-[320px]">A maneira mais simples de descobrir o preço, escolher o modelo e fechar a piscina dos seus sonhos — sem vendedor no caminho.</p>
            </div>
            <div>
              <h5 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50 mb-4">Cliente</h5>
              <ul className="space-y-2.5 text-[14px]">
                <li><button onClick={handleSimulate} className="hover:text-white">Simular piscina</button></li>
                <li><a href="#modelos" className="hover:text-white">Modelos</a></li>
                <li><a href="#como-funciona" className="hover:text-white">Como funciona</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50 mb-4">Fábricas</h5>
              <ul className="space-y-2.5 text-[14px]">
                <li><a href="/parceiros" className="hover:text-white">Para fabricantes</a></li>
                <li><a href="/parceiros" className="hover:text-white">Cadastrar marca</a></li>
                <li><a href="/login" className="hover:text-white">Entrar (painel)</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50 mb-4">Empresa</h5>
              <ul className="space-y-2.5 text-[14px]">
                <li><a href="mailto:simulapool@gmail.com" className="hover:text-white">Contato</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-wrap justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/45">
            <span>© {new Date().getFullYear()} SimulaPool · Todos os direitos reservados</span>
            <span>Composto em Montserrat · Inter · JetBrains Mono</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

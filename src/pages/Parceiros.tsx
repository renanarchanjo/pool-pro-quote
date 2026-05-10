import { useState, useEffect } from "react";
import { Loader2, Target, Eye, BarChart3, Megaphone, Sparkles, Trophy, MessageCircle, ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
import PageSEO from "@/components/PageSEO";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
}

const METRICS = [
  { value: "4.800+", label: "simulações/mês" },
  { value: "200+", label: "modelos no catálogo" },
  { value: "50+", label: "cidades ativas" },
];

const BENEFITS = [
  {
    icon: Target,
    title: "Momento exato da decisão",
    description: "Sua marca aparece quando o cliente já está escolhendo modelo, tamanho e opcionais. Não é impressão genérica — é influência direta na compra.",
  },
  {
    icon: Eye,
    title: "Milhares de impressões qualificadas",
    description: "Cada simulação exibe sua marca no PDF, na tela de resultados e no compartilhamento via WhatsApp. Volume real, audiência certa.",
  },
  {
    icon: BarChart3,
    title: "Dados estratégicos do mercado",
    description: "Relatórios mensais com modelos mais buscados, cidades com maior demanda e ticket médio por região. Intel que seus concorrentes não têm.",
  },
  {
    icon: Megaphone,
    title: "Presença em todo o funil",
    description: "Landing page, simulador, proposta PDF e área do lojista — sua marca presente em cada etapa, do primeiro clique ao fechamento.",
  },
  {
    icon: Sparkles,
    title: "Selo 'Recomendado SimulaPool'",
    description: "Use o selo oficial nos seus materiais. Associe sua marca à plataforma que os lojistas já usam para vender.",
  },
  {
    icon: Trophy,
    title: "Prioridade no catálogo",
    description: "Seus produtos e modelos aparecem em destaque no simulador — na frente da concorrência, direto na decisão do consumidor.",
  },
];

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_CONTACT || "5543999913065";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá! Quero posicionar minha marca no SimulaPool. Podem me explicar como funciona a parceria?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease },
  }),
};

const Parceiros = () => {
  useForceLightTheme();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("partners")
      .select("id, name, logo_url")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setPartners(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSEO
        title="Parceiros SIMULAPOOL - Posicione sua marca no simulador"
        description="Seja parceiro SIMULAPOOL e posicione sua marca diretamente no simulador de piscinas mais usado do Brasil."
        path="/parceiros"
      />
      {/* ─── Hero ─── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0A1628 0%, #0C1A33 30%, #0D1F3C 50%, #0F2847 65%, #1A3A5C 80%, #3D6B8D 90%, #7AADCB 96%, #FFFFFF 100%)",
          minHeight: "100svh",
        }}
      >
        <SiteHeader />

        {/* Blobs */}
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{ width: 500, height: 500, top: -80, left: -120, background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)" }}
        />
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{ width: 400, height: 400, bottom: 80, right: -80, background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-[740px] mx-auto text-center px-5 md:px-4 pt-10 pb-16 md:pt-24 md:pb-36">
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="text-[11px] md:text-[13px] font-medium tracking-[0.08em] uppercase mb-4 md:mb-6"
            style={{ color: "rgba(125,211,252,0.55)" }}
          >
            Para Fabricantes e Marcas
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="font-sp-display text-[28px] leading-[1.1] md:text-[54px] md:leading-[1.04] font-extrabold text-white tracking-[-0.03em] mb-5 md:mb-7 text-balance"
          >
            Coloque sua marca no{" "}
            <span className="text-[#38BDF8]">momento exato</span>{" "}
            da decisão de compra
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-[14px] md:text-[18px] max-w-[540px] mx-auto mb-8 md:mb-12 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Seja exibido dentro de milhares de simulações reais todos os meses e influencie diretamente quem já está pronto para comprar uma piscina.
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full md:w-auto inline-flex items-center justify-center h-12 md:h-[52px] px-8 md:px-10 text-[15px] md:text-[16px] font-semibold rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-cta-pulse"
              style={{
                backgroundColor: "#FFFFFF",
                color: "#0A1628",
              }}
            >
              Quero posicionar minha marca
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>

          {/* Value prop line */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="text-[12px] md:text-[13px] mt-4 md:mt-5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Sua marca integrada ao fluxo de decisão de compra
          </motion.p>

          {/* Metrics */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={5}
            className="flex items-center justify-center mt-10 md:mt-14 bg-white/[0.07] backdrop-blur-sm rounded-2xl px-5 md:px-8 py-4 md:py-5 mx-auto w-fit"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {METRICS.map((m, i) => (
              <div key={m.label} className="flex items-center">
                {i > 0 && <div className="w-px h-8 md:h-10 mx-3 md:mx-7" style={{ background: "rgba(255,255,255,0.15)" }} />}
                <div className="text-center">
                  <p className="text-[18px] md:text-[28px] font-bold text-white">{m.value}</p>
                  <p className="text-[10px] md:text-[12px] mt-0.5 md:mt-1 font-medium tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>{m.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── How it works — visual flow ─── */}
      <section className="py-16 md:py-24 px-4 bg-background">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease }}
            className="text-center mb-12 md:mb-16"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              ONDE SUA MARCA APARECE
            </p>
            <h2 className="font-sp-display text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
              Presente em cada etapa do funil
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[500px] mx-auto">
              Do primeiro acesso ao PDF compartilhado no WhatsApp — sua marca acompanha o cliente em toda a jornada.
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              { step: "01", title: "Simulador público", desc: "O cliente acessa, escolhe modelo e opcionais. Sua marca aparece como fabricante recomendado." },
              { step: "02", title: "Tela de resultado", desc: "O orçamento é gerado com seus produtos em destaque. Sua logo visível na proposta interativa." },
              { step: "03", title: "PDF compartilhado", desc: "O cliente salva e envia o PDF via WhatsApp. Sua marca circula organicamente entre decisores." },
              { step: "04", title: "Painel do lojista", desc: "O revendedor vê seus produtos como opção premium ao montar propostas para seus clientes." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                custom={i}
                className="group flex items-start gap-5 bg-background border border-border rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.12)]"
              >
                <span className="text-[28px] font-bold text-border group-hover:text-primary/40 transition-colors duration-300 leading-none mt-0.5 shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ─── */}
      <section className="py-16 md:py-24 px-4" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)" }}>
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              VANTAGENS
            </p>
            <h2 className="font-sp-display text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
              Por que marcas líderes escolhem o SimulaPool
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[500px] mx-auto">
              Exposição segmentada onde a decisão de compra acontece — não em feeds genéricos.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                custom={i}
                className="group bg-background border border-border rounded-2xl p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.15)]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors duration-300">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground mb-2">{b.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{b.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Current Partners ─── */}
      <section className="py-16 md:py-20 px-4 bg-background">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              QUEM JÁ ESTÁ
            </p>
            <h2 className="text-[22px] md:text-[28px] font-bold text-foreground tracking-[-0.02em]">
              Marcas que já estão no fluxo de compra
            </h2>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : partners.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-semibold mb-1">Vagas limitadas por segmento</p>
              <p className="text-[14px] text-muted-foreground">Garanta presença antes dos seus concorrentes.</p>
            </motion.div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {partners.map((partner, i) => (
                <motion.div
                  key={partner.id}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  custom={i}
                  className="bg-background border border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5 min-w-[140px] transition-all duration-300 hover:border-primary/20 hover:shadow-[0_4px_20px_-8px_rgba(14,165,233,0.12)]"
                >
                  <div className="w-16 h-16 flex items-center justify-center">
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{partner.name}</span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-foreground">{partner.name}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section
        className="py-20 md:py-28 px-4"
        style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, #F0F9FF 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease }}
          className="max-w-[560px] mx-auto text-center"
        >
          <h2 className="font-sp-display text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
            Sua marca já poderia estar{" "}
            <span className="text-primary">influenciando compras</span>
          </h2>
          <p className="text-[15px] text-muted-foreground mb-10 leading-relaxed max-w-[460px] mx-auto">
            Cada dia sem presença no SimulaPool são milhares de simulações onde seus concorrentes aparecem — e você não.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{ boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}
            >
              Quero posicionar minha marca
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="mailto:simulapool@gmail.com"
              className="inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl border border-border text-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary"
            >
              Enviar e-mail
            </a>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Parceiros;

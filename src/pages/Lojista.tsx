import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Smartphone,
  Calculator,
  Users,
  BarChart3,
  Clock,
  Shield,
  Zap,
  FileText,
  Send,
  Target,
} from "lucide-react";
import LojistaHeader from "@/components/landing/LojistaHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const METRICS = [
  { value: "200+", label: "lojistas ativos" },
  { value: "4.800+", label: "simulações/mês" },
  { value: "50+", label: "cidades cobertas" },
];

const BENEFITS_AUTOMATION = [
  {
    icon: Calculator,
    title: "Orçamento em segundos",
    description:
      "Seu cliente escolhe modelo, opcionais e recebe o preço final na hora. Você não precisa abrir planilha, ligar de volta nem calcular nada manualmente.",
    highlight: "Reduz de 30 min para menos de 2 min por orçamento.",
  },
  {
    icon: FileText,
    title: "Proposta PDF profissional",
    description:
      "O sistema gera automaticamente um PDF com sua logo, cores, itens inclusos, opcionais e condições de pagamento. Pronto para enviar por WhatsApp.",
    highlight: "Sua marca, sem marca d'água no plano pago.",
  },
  {
    icon: Smartphone,
    title: "Simulador mobile-first",
    description:
      "Compartilhe o link do seu simulador por WhatsApp ou redes sociais. O cliente faz tudo pelo celular — e você recebe a proposta pronta no painel.",
    highlight: "Funciona 24h, mesmo quando a loja está fechada.",
  },
];

const BENEFITS_MANAGEMENT = [
  {
    icon: Users,
    title: "Equipe e comissões",
    description:
      "Cadastre vendedores, defina limite de leads por pessoa e acompanhe a performance individual. O sistema distribui leads automaticamente.",
    highlight: "Controle de comissão por vendedor.",
  },
  {
    icon: BarChart3,
    title: "Funil de vendas completo",
    description:
      "Acompanhe cada proposta do primeiro contato ao fechamento. Veja taxa de conversão, ticket médio e faturamento em tempo real no dashboard.",
    highlight: "Dados reais para decisões inteligentes.",
  },
  {
    icon: Shield,
    title: "100% personalizado",
    description:
      "Logo, paleta de cores e catálogo de piscinas configurados na sua conta. Cada orçamento sai com a identidade da sua loja, não com a nossa.",
    highlight: "Seu catálogo, seus preços, sua marca.",
  },
];

const BENEFITS_LEADS = [
  {
    icon: Target,
    title: "Captação de leads automática",
    description:
      "Consumidores que simulam piscinas no nosso portal público viram leads qualificados. Receba direto no seu painel clientes que já sabem o que querem.",
    highlight: "Leads que já escolheram modelo e viram o preço.",
  },
  {
    icon: Send,
    title: "Notificação instantânea",
    description:
      "Assim que um lead chega, você e sua equipe recebem alerta push no celular. Aceite, visualize os dados e entre em contato em minutos.",
    highlight: "Tempo de resposta é tudo no fechamento.",
  },
  {
    icon: Clock,
    title: "Economize horas por dia",
    description:
      "Sem rascunho no papel, sem retrabalho. O sistema centraliza orçamentos, propostas e follow-ups num só lugar. Mais vendas, menos burocracia.",
    highlight: "Lojistas relatam economia de 2h+ por dia.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Crie sua conta grátis",
    desc: "Cadastre sua loja em menos de 2 minutos. Sem cartão de crédito, sem compromisso.",
  },
  {
    step: "02",
    title: "Configure seu catálogo",
    desc: "Adicione seus modelos de piscina, opcionais e preços. Nós importamos tudo pra você se quiser.",
  },
  {
    step: "03",
    title: "Feche mais vendas",
    desc: "Acompanhe propostas, negocie pelo painel e converta mais com dados reais do seu funil.",
  },
];

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease },
  }),
};

const Lojista = () => {
  useForceLightTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Hero ─── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #0A1628 0%, #0C1A33 30%, #0D1F3C 50%, #0F2847 65%, #1A3A5C 78%, #3D6B8D 86%, #7AADCB 91%, #C5E2F0 95%, #FFFFFF 100%)",
        }}
      >
        <LojistaHeader />

        {/* Blobs */}
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{
            width: 500,
            height: 500,
            top: -80,
            left: -120,
            background:
              "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{
            width: 400,
            height: 400,
            bottom: 80,
            right: -80,
            background:
              "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-[740px] mx-auto text-center px-5 md:px-4 pt-12 pb-24 md:pt-24 md:pb-36">
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="text-[12px] md:text-[13px] font-medium tracking-[0.08em] uppercase mb-5 md:mb-6"
            style={{ color: "rgba(125,211,252,0.55)" }}
          >
            Para Lojistas de Piscinas
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-[32px] leading-[1.1] md:text-[54px] md:leading-[1.06] font-bold text-white tracking-[-0.03em] mb-6 md:mb-7"
          >
            Venda mais piscinas com{" "}
            <span className="text-[#38BDF8]">orçamentos automáticos</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-[15px] md:text-[18px] max-w-[540px] mx-auto mb-10 md:mb-12 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Seu cliente simula a piscina pelo celular, recebe o preço na hora e
            você recebe o lead pronto pra fechar. Sem planilha, sem ligação.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate("/auth")}
              className="group w-full sm:w-auto inline-flex items-center justify-center h-[52px] px-10 text-[16px] font-semibold rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-cta-pulse"
              style={{ backgroundColor: "#FFFFFF", color: "#0A1628" }}
            >
              Criar Minha Loja Grátis
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto inline-flex items-center justify-center h-[52px] px-8 text-[15px] font-medium rounded-xl text-white transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Já tenho conta
            </button>
          </motion.div>

          {/* Trust */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="text-[13px] mt-5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Sem cartão de crédito · Começa grátis · Cancele quando quiser
          </motion.p>

          {/* Metrics */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            className="flex items-center justify-center mt-14 bg-white/[0.07] backdrop-blur-sm rounded-2xl px-8 py-5 mx-auto w-fit"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {METRICS.map((m, i) => (
              <div key={m.label} className="flex items-center">
                {i > 0 && (
                  <div
                    className="w-px h-10 mx-5 md:mx-7"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  />
                )}
                <div className="text-center">
                  <p className="text-[22px] md:text-[28px] font-bold text-white">
                    {m.value}
                  </p>
                  <p
                    className="text-[11px] md:text-[12px] mt-1 font-medium tracking-wide"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {m.label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── How it works ─── */}
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
              COMO FUNCIONA
            </p>
            <h2 className="text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
              Da criação à primeira venda em minutos
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[500px] mx-auto">
              Configure sua loja, compartilhe o link e comece a receber leads
              qualificados automaticamente.
            </p>
          </motion.div>

          <div className="space-y-4">
            {STEPS.map((item, i) => (
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
                  <h3 className="text-[15px] font-semibold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ─── */}
      <section
        className="py-16 md:py-24 px-4"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)",
        }}
      >
        <div className="max-w-[1060px] mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14 md:mb-20"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              POR QUE USAR O SIMULAPOOL
            </p>
            <h2 className="text-[24px] md:text-[36px] font-bold text-foreground tracking-[-0.02em] mb-3">
              Automação de ponta a ponta
            </h2>
            <p className="text-[15px] md:text-[17px] text-muted-foreground max-w-[560px] mx-auto leading-relaxed">
              Do orçamento ao fechamento — tudo automatizado. E de bônus,
              você ainda recebe leads de consumidores que já simularam.
            </p>
          </motion.div>

          {/* ── Group 1: Automação de Orçamentos ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 mb-5 px-1">
              <div className="w-1.5 h-6 rounded-full bg-primary" />
              <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-primary">
                Automação de Orçamentos
              </h3>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            {BENEFITS_AUTOMATION.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                custom={i}
                className="group bg-background border border-border rounded-2xl p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.15)] flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors duration-300">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-[16px] font-semibold text-foreground mb-2">
                  {b.title}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 flex-1">
                  {b.description}
                </p>
                <p className="text-[12px] font-semibold text-primary/80 bg-primary/5 rounded-lg px-3 py-2">
                  ✦ {b.highlight}
                </p>
              </motion.div>
            ))}
          </div>

          {/* ── Group 2: Gestão & Inteligência ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 mb-5 px-1">
              <div className="w-1.5 h-6 rounded-full bg-primary" />
              <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-primary">
                Gestão & Inteligência
              </h3>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            {BENEFITS_MANAGEMENT.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                custom={i}
                className="group bg-background border border-border rounded-2xl p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.15)] flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors duration-300">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-[16px] font-semibold text-foreground mb-2">
                  {b.title}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 flex-1">
                  {b.description}
                </p>
                <p className="text-[12px] font-semibold text-primary/80 bg-primary/5 rounded-lg px-3 py-2">
                  ✦ {b.highlight}
                </p>
              </motion.div>
            ))}
          </div>

          {/* ── Group 3: Captação de Leads ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 mb-5 px-1">
              <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
              <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-emerald-600">
                Bônus — Captação de Leads
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full ml-1">
                Incluso
              </span>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {BENEFITS_LEADS.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                custom={i}
                className="group bg-background border border-emerald-200 rounded-2xl p-7 transition-all duration-300 hover:border-emerald-400/40 hover:shadow-[0_8px_30px_-12px_rgba(16,185,129,0.15)] flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition-colors duration-300">
                  <b.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-[16px] font-semibold text-foreground mb-2">
                  {b.title}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 flex-1">
                  {b.description}
                </p>
                <p className="text-[12px] font-semibold text-emerald-700/80 bg-emerald-50 rounded-lg px-3 py-2">
                  ✦ {b.highlight}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>




      {/* ─── Final CTA ─── */}
      <section
        className="py-20 md:py-28 px-4"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background)) 0%, #F0F9FF 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease }}
          className="max-w-[560px] mx-auto text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
            Comece agora e venda{" "}
            <span className="text-primary">antes do verão</span>
          </h2>
          <p className="text-[15px] text-muted-foreground mb-10 leading-relaxed max-w-[460px] mx-auto">
            Cada dia sem o SimulaPool são leads que vão pro concorrente. Crie
            sua loja em 2 minutos e comece a receber simulações hoje.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/auth")}
              className="group inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-cta-pulse"
              style={{ boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}
            >
              Criar Minha Loja Grátis
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl border border-border text-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary"
            >
              Já tenho conta
            </button>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Lojista;

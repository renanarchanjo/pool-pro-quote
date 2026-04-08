import { useState, useEffect } from "react";
import { Loader2, TrendingUp, MapPin, Shield, Zap, Users, BarChart3, MessageCircle, ArrowRight, Star, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
}

const RESULTS = [
  { icon: TrendingUp, value: "4.800+", label: "leads gerados por mês" },
  { icon: MapPin, value: "50+", label: "cidades atendidas" },
  { icon: Users, value: "200+", label: "lojistas na rede" },
];

const BENEFITS = [
  {
    icon: MapPin,
    title: "Exclusividade na sua cidade",
    description: "Apenas um lojista por região. Todos os leads da sua cidade vão direto pro seu painel.",
  },
  {
    icon: TrendingUp,
    title: "Clientes prontos pra comprar",
    description: "Leads qualificados que já escolheram modelo, tamanho e opcionais. Só falta o contato com você.",
  },
  {
    icon: BarChart3,
    title: "Dados de mercado em tempo real",
    description: "Saiba quais modelos vendem mais na sua região, ticket médio e tendências antes da concorrência.",
  },
  {
    icon: Shield,
    title: "Sua marca em cada orçamento",
    description: "Logo, cores e dados da sua loja em todos os PDFs enviados — milhares de impressões mensais.",
  },
  {
    icon: Zap,
    title: "Zero custo de aquisição",
    description: "O cliente vem até você pelo simulador. Sem gastar com anúncio, sem cold call, sem perder tempo.",
  },
  {
    icon: Star,
    title: "Setup e suporte completo",
    description: "Time dedicado para cadastrar seus modelos, configurar preços e te acompanhar na operação.",
  },
];

const WHATSAPP_NUMBER = "5543999913065";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá! Quero receber clientes na minha cidade pelo SimulaPool. Podem me explicar como funciona?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
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
      {/* ─── Hero: same unified dark block as Index ─── */}
      <div
        className="hero-gradient relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0A1628 0%, #0D1F3C 30%, #0A2744 55%, #E8F4FD 88%, #FFFFFF 100%)",
        }}
      >
        <SiteHeader />

        <div className="relative z-10 max-w-[720px] mx-auto text-center px-5 md:px-4 pt-12 pb-20 md:pt-20 md:pb-32">
          <motion.span
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-md mb-8"
            style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)", color: "#7DD3FC" }}
          >
            <span style={{ color: "#38BDF8" }}>✦</span>
            Programa de Parceiros
          </motion.span>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-[32px] leading-[1.12] md:text-[52px] md:leading-[1.08] font-bold text-white tracking-[-0.025em] mb-5"
          >
            Receba clientes{" "}
            <span className="text-[#38BDF8]">prontos para comprar</span>
            <br className="hidden md:block" />
            {" "}na sua cidade
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-[15px] md:text-[18px] max-w-[500px] mx-auto mb-10 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Leads qualificados, exclusividade regional e zero custo de aquisição. O cliente simula, escolhe a piscina e chega pronto no seu WhatsApp.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center h-[52px] px-8 text-[16px] font-semibold rounded-xl text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                backgroundColor: "#0EA5E9",
                boxShadow: "0 0 40px rgba(14,165,233,0.4), 0 4px 16px rgba(14,165,233,0.25)",
              }}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Quero receber clientes na minha cidade
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>

          {/* Results metrics */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="flex items-center justify-center mt-12"
          >
            {RESULTS.map((r, i) => (
              <div key={r.label} className="flex items-center">
                {i > 0 && <div className="w-px h-10 mx-5 md:mx-6" style={{ background: "rgba(255,255,255,0.1)" }} />}
                <div className="text-center">
                  <p className="text-[22px] md:text-[26px] font-bold text-white">{r.value}</p>
                  <p className="text-[11px] md:text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{r.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── Benefits ─── */}
      <section className="py-16 md:py-24 px-4 bg-background">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              POR QUE ENTRAR
            </p>
            <h2 className="text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
              O que você ganha sendo parceiro
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[480px] mx-auto">
              Tudo pensado pra você vender mais gastando menos tempo e dinheiro com captação.
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
      <section className="py-16 md:py-20 px-4" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)" }}>
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              REDE
            </p>
            <h2 className="text-[22px] md:text-[28px] font-bold text-foreground tracking-[-0.02em]">
              Quem já faz parte
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
              <p className="text-foreground font-semibold mb-1">Vagas limitadas por cidade</p>
              <p className="text-[14px] text-muted-foreground">Garanta exclusividade na sua região.</p>
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
      <section className="py-20 md:py-28 px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[560px] mx-auto text-center"
        >
          <h2 className="text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em] mb-3">
            Sua cidade ainda está{" "}
            <span className="text-primary">disponível?</span>
          </h2>
          <p className="text-[15px] text-muted-foreground mb-10 leading-relaxed max-w-[440px] mx-auto">
            Vagas limitadas por região. Fale com o time comercial e garanta exclusividade antes da concorrência.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{ boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Quero ser parceiro
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

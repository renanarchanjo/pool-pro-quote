import { useState, useEffect } from "react";
import { Loader2, FileText, Eye, BarChart3, Star, TrendingUp, Zap, MessageCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInViewAnimation } from "@/hooks/useInViewAnimation";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
}

const BENEFITS = [
  {
    icon: FileText,
    title: "Sua marca em todo orçamento",
    description: "Logo exibido em cada PDF gerado — milhares de propostas circulando via WhatsApp com sua marca em destaque.",
  },
  {
    icon: Eye,
    title: "Vitrine na plataforma",
    description: "Destaque premium na landing page, página de parceiros e dentro do painel dos lojistas — visibilidade 24/7.",
  },
  {
    icon: BarChart3,
    title: "Relatórios de mercado exclusivos",
    description: "Dados estratégicos mensais: cidades com mais demanda, modelos mais buscados, ticket médio e tendências do setor.",
  },
  {
    icon: Star,
    title: 'Selo "Recomendado SIMULAPOOL"',
    description: "Use o selo oficial em seus materiais de marketing. Associe sua marca à plataforma líder do segmento.",
  },
  {
    icon: TrendingUp,
    title: "Prioridade no catálogo",
    description: "Produtos e modelos da sua marca aparecem em destaque no simulador — diretamente na decisão de compra do consumidor.",
  },
  {
    icon: Zap,
    title: "CPM imbatível",
    description: "Custo por impressão muito inferior à mídia tradicional. Alcance segmentado e qualificado no mercado de piscinas.",
  },
];

const WHATSAPP_NUMBER = "5543999913065";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá! Tenho interesse em ser parceiro SIMULAPOOL. Gostaria de saber mais sobre os planos de parceria."
);

const Parceiros = () => {
  useForceLightTheme();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: heroRef, isVisible: heroVisible } = useInViewAnimation(0.1);
  const { ref: benefitsRef, isVisible: benefitsVisible } = useInViewAnimation(0.1);
  const { ref: partnersRef, isVisible: partnersVisible } = useInViewAnimation(0.1);
  const { ref: ctaRef, isVisible: ctaVisible } = useInViewAnimation(0.15);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, logo_url")
        .eq("active", true)
        .order("display_order", { ascending: true });
      setPartners(data || []);
      setLoading(false);
    };
    fetchPartners();
  }, []);

  const handleCTA = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`,
      "_blank"
    );
  };

  const slideStyle = (visible: boolean, fromRight = false, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateX(0)' : `translateX(${fromRight ? '40px' : '-40px'})`,
    transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* ── HERO / SLOGAN ── */}
      <section ref={heroRef} className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-background to-cyan-50/30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div style={slideStyle(heroVisible, false, 0)}>
              <Badge className="mb-6 px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                Programa de Parceiros
              </Badge>
            </div>
            <h1
              className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]"
              style={slideStyle(heroVisible, true, 100)}
            >
              Sua marca no{" "}
              <span className="text-primary">maior simulador</span>
              <br />
              de piscinas do Brasil
            </h1>
            <p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
              style={slideStyle(heroVisible, false, 200)}
            >
              Milhares de orçamentos circulam todos os meses pelo WhatsApp com a marca dos nossos parceiros.
              Esteja onde o lojista decide — e onde o consumidor compra.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" style={slideStyle(heroVisible, true, 300)}>
              <Button
                size="lg"
                onClick={handleCTA}
                className="gradient-primary text-white font-display font-bold text-lg px-8 py-6 shadow-pool"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Quero ser parceiro
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("beneficios")?.scrollIntoView({ behavior: "smooth" })
                }
                className="font-display font-semibold text-lg px-8 py-6"
              >
                Ver benefícios
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFÍCIOS ── */}
      <section id="beneficios" className="py-20 bg-muted/30" ref={benefitsRef}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14" style={slideStyle(benefitsVisible, false, 0)}>
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-4">
              Por que as marcas escolhem a SIMULAPOOL?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Exposição segmentada, dados estratégicos e presença onde a decisão de compra acontece.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {BENEFITS.map((b, i) => (
              <Card
                key={i}
                className="p-6 border-border/50 hover:border-primary/20 hover-lift group"
                style={slideStyle(benefitsVisible, i % 2 === 0, 100 + i * 80)}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARCEIROS ATUAIS ── */}
      <section className="py-20" ref={partnersRef}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12" style={slideStyle(partnersVisible, true, 0)}>
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-4">
              Quem já faz parte
            </h2>
            <p className="text-muted-foreground text-lg">
              Marcas que confiam na SIMULAPOOL para alcançar o mercado de piscinas.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-16" style={slideStyle(partnersVisible, false, 150)}>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg font-medium">
                Seja o primeiro parceiro oficial!
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Garanta exclusividade de lançamento com condições especiais.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8 max-w-5xl mx-auto">
              {partners.map((partner, i) => (
                <Card
                  key={partner.id}
                  className="p-6 flex flex-col items-center justify-center gap-3 border-border/50 hover:border-primary/20 hover-lift min-w-[160px]"
                  style={slideStyle(partnersVisible, i % 2 === 0, 100 + i * 80)}
                >
                  <div className="w-24 h-24 flex items-center justify-center">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={partner.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-display font-bold text-primary">
                        {partner.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{partner.name}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 bg-muted/30" ref={ctaRef}>
        <div className="container mx-auto px-4">
          <Card
            className="max-w-3xl mx-auto p-10 md:p-14 text-center border-primary/20 bg-gradient-to-br from-primary/[0.05] to-accent/[0.03]"
            style={slideStyle(ctaVisible, false, 0)}
          >
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-4">
              Pronto para colocar sua marca
              <br />
              <span className="text-primary">onde o mercado decide?</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Entre em contato com nosso time comercial e descubra como a SIMULAPOOL pode impulsionar a presença da sua marca.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" style={slideStyle(ctaVisible, true, 150)}>
              <Button
                size="lg"
                onClick={handleCTA}
                className="gradient-primary text-white font-display font-bold text-lg px-10 py-6 shadow-pool"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversar pelo WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = "mailto:simulapool@gmail.com")}
                className="font-display font-semibold text-lg px-10 py-6"
              >
                Enviar e-mail
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Parceiros;

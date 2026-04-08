import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface HowItWorksProps {
  onSimulate: () => void;
}

const steps = [
  {
    number: "01",
    title: "Escolha o modelo",
    description:
      "Navegue por modelos de piscinas de fibra por tamanho, formato e estilo. Tem opção pra todo espaço e orçamento.",
  },
  {
    number: "02",
    title: "Monte do seu jeito",
    description:
      "Adicione escada, iluminação, aquecimento e outros opcionais. O preço atualiza em tempo real conforme você personaliza.",
  },
  {
    number: "03",
    title: "Receba seu orçamento",
    description:
      "Seu orçamento detalhado fica pronto na hora, com todos os itens selecionados. Salve em PDF ou compartilhe pelo WhatsApp.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;
const cardVariant = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.15 + i * 0.13, ease },
  }),
};

const HowItWorks = ({ onSimulate }: HowItWorksProps) => {
  return (
    <section className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
            COMO FUNCIONA
          </p>
          <h2 className="text-[24px] md:text-[32px] font-bold text-foreground tracking-[-0.02em]">
            Do sonho ao orçamento em 3 passos
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              variants={cardVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              custom={i}
              className="group relative bg-background border border-border rounded-2xl p-7 md:p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.15)]"
            >
              {/* Step number */}
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="text-[32px] md:text-[36px] font-bold leading-none tracking-[-0.04em] transition-colors duration-300 group-hover:text-primary"
                  style={{ color: "#E5E7EB" }}
                >
                  {step.number}
                </span>
                <div className="h-px flex-1 bg-border group-hover:bg-primary/20 transition-colors duration-300" />
              </div>
              <h3 className="text-[16px] md:text-[17px] font-semibold text-foreground mb-2.5">
                {step.title}
              </h3>
              <p className="text-[13px] md:text-[14px] text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Inline CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mt-10 md:mt-14"
        >
          <button
            onClick={onSimulate}
            className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Começar simulação agora
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

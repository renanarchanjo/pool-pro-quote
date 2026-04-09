interface BlurredPriceProps {
  value: number;
  prefix?: string;
  className?: string;
}

const BlurredPrice = ({ value, prefix = "R$", className = "" }: BlurredPriceProps) => {
  const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const chars = formatted.split("");

  return (
    <span className={`relative select-none inline-flex items-baseline gap-0.5 ${className}`}>
      <span>{prefix}</span>
      <span className="inline-flex">
        {chars.map((char, i) => {
          // Separators (dots, commas) follow the blur of adjacent digits
          if (char === "." || char === ",") {
            const progress = i / Math.max(chars.length - 1, 1);
            const blur = progress > 0.7 ? 0 : progress > 0.4 ? 2 : 4;
            return <span key={i} style={{ filter: `blur(${blur}px)`, opacity: blur > 2 ? 0.7 : 1 }}>{char}</span>;
          }
          // First ~30% of chars: crisp, middle: light blur, end: heavy blur
          const progress = i / Math.max(chars.length - 1, 1);
          let blur: number;
          let opacity: number;
          if (progress > 0.7) {
            blur = 0;
            opacity = 1;
          } else if (progress > 0.5) {
            blur = 2;
            opacity = 0.9;
          } else if (progress > 0.3) {
            blur = 3.5;
            opacity = 0.8;
          } else {
            blur = 5;
            opacity = 0.7;
          }
          return <span key={i} style={{ filter: `blur(${blur}px)`, opacity }}>{char}</span>;
        })}
      </span>
    </span>
  );
};

export default BlurredPrice;

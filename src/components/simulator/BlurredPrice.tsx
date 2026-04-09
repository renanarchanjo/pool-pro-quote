interface BlurredPriceProps {
  value: number;
  prefix?: string;
  className?: string;
}

const BlurredPrice = ({ value, prefix = "R$", className = "" }: BlurredPriceProps) => {
  const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return (
    <span className={`relative select-none inline-flex items-baseline gap-0.5 ${className}`}>
      <span>{prefix}</span>
      <span className="blur-[4px] opacity-80">{formatted}</span>
    </span>
  );
};

export default BlurredPrice;

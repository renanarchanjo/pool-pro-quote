interface BlurredPriceProps {
  value: number;
  prefix?: string;
  className?: string;
}

const BlurredPrice = ({ value, prefix = "R$", className = "" }: BlurredPriceProps) => {
  const formatted = `${prefix} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  return (
    <span className={`relative select-none ${className}`}>
      <span className="blur-[6px] opacity-70">{formatted}</span>
    </span>
  );
};

export default BlurredPrice;

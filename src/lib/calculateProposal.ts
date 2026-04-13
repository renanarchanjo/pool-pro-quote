export interface PricedOptional {
  price: number;
}

export function calculateTotalPrice(
  basePrice: number,
  includedItemsTotal: number,
  optionals: PricedOptional[],
): number {
  const optionalsPrice = optionals.reduce((sum, opt) => sum + opt.price, 0);
  return basePrice + includedItemsTotal + optionalsPrice;
}

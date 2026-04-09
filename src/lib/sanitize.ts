export const sanitizeText = (input: string, maxLength = 500): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "");
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/\D/g, "").slice(0, 11);
};

export const sanitizeCNPJ = (cnpj: string): string => {
  return cnpj.replace(/\D/g, "").slice(0, 14);
};

export const sanitizeCurrency = (value: number): number => {
  if (isNaN(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
};

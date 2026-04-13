export const sanitizeText = (input: string, maxLength = 500): string => {
  return input
    .trim()
    .slice(0, maxLength)
    // Strip HTML tags entirely (handles nested/malformed tags)
    .replace(/<[^>]*>?/g, "")
    // Remove null bytes and control characters (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Strip javascript: / data: URI patterns
    .replace(/(?:javascript|data|vbscript)\s*:/gi, "")
    // Strip common event handler patterns
    .replace(/on\w+\s*=/gi, "");
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

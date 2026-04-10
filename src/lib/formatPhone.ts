/**
 * Formats a Brazilian phone number for Z-API / WhatsApp.
 * Always returns digits-only with country code 55.
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");

  // Already has 55 prefix
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  // Starts with 0 (trunk prefix)
  if (digits.startsWith("0")) {
    return "55" + digits.slice(1);
  }

  // Just DDD + number
  return "55" + digits;
};

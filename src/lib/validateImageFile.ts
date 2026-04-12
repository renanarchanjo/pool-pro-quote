import { toast } from "sonner";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validates an image file for type and size before upload.
 * Shows a toast error and returns false if invalid.
 */
export function validateImageFile(file: File): boolean {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.error("Formato inválido. Use JPEG, PNG ou WebP.");
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error("A imagem deve ter no máximo 5MB.");
    return false;
  }
  return true;
}

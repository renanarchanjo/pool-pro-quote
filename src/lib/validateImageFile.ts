import { toast } from "sonner";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed file extensions as a fallback when MIME type is unreliable
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Validates an image file for type, extension, and size before upload.
 * Shows a toast error and returns false if invalid.
 */
export function validateImageFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
    toast.error("Formato inválido. Use JPEG, PNG ou WebP.");
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error("A imagem deve ter no máximo 5MB.");
    return false;
  }
  return true;
}

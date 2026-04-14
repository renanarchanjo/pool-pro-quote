import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Faz upload seguro do PDF via backend e retorna uma signed URL (48h TTL).
 * Mantém a mesma assinatura para compatibilidade com fluxos legados.
 */
export async function savePdfToStorage(
  storeId: string,
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!pdfBlob || pdfBlob.size === 0) {
    throw new Error("PDF inválido: blob vazio ou nulo");
  }

  if (pdfBlob.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("PDF muito grande (>20MB). Tente reduzir a qualidade.");
  }

  console.log("[WPP] 4. Blob válido:", pdfBlob.size, "bytes. Iniciando upload seguro via backend...");

  const file = new File([pdfBlob], `proposta-${proposalId}.pdf`, {
    type: "application/pdf",
  });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[WPP] 4. Upload seguro tentativa ${attempt}/${MAX_RETRIES}...`);
      onProgress?.(10);

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("storeId", storeId);
      formData.append("proposalId", proposalId);
      formData.append("uploadOnly", "true");

      const { data, error } = await supabase.functions.invoke("send-proposal-whatsapp", {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || "Falha no upload seguro do PDF");
      }

      if (!data?.success || !data?.pdfUrl) {
        throw new Error(data?.error || "Upload concluído sem URL assinada");
      }

      onProgress?.(100);
      console.log("[WPP] 4. Upload seguro concluído com sucesso");
      console.log("[WPP] 4. Signed URL gerada:", data.pdfUrl.substring(0, 80) + "...");
      return data.pdfUrl as string;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[WPP] 4. Upload seguro falhou (tentativa ${attempt}):`, lastError.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1] || 2000;
        console.log(`[WPP] 4. Aguardando ${delay}ms antes de retry...`);
        onProgress?.(0);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      Sentry.captureException(lastError, {
        tags: { feature: "pdf_upload_secure_backend" },
        extra: { storeId, proposalId, attempts: attempt },
      });
      throw lastError;
    }
  }

  throw lastError ?? new Error("Falha desconhecida no upload seguro do PDF");
}

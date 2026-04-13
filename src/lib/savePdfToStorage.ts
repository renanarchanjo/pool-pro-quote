import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a Blob to a base64 string (without the data URI prefix).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:application/pdf;base64," prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a PDF blob via Edge Function (server-side, bypasses storage RLS)
 * and returns a signed URL with 48h TTL.
 */
export async function savePdfToStorage(
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let currentProgress = 0;

  if (onProgress) {
    onProgress(0);
    progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 8, 80);
      onProgress(currentProgress);
    }, 300);
  }

  try {
    // Convert blob to base64
    const pdfBase64 = await blobToBase64(pdfBlob);
    if (onProgress) onProgress(35);

    // Upload via Edge Function (uses service role key, bypasses all RLS)
    const { data, error } = await supabase.functions.invoke(
      "upload-proposal-pdf",
      { body: { proposalId, pdfBase64 } },
    );

    if (error) {
      throw new Error(
        typeof error === "object" && "message" in error
          ? (error as Error).message
          : "Erro ao enviar PDF",
      );
    }

    if (data?.error) {
      throw new Error(String(data.error));
    }

    if (!data?.signedUrl) {
      throw new Error("URL do PDF não retornada pelo servidor");
    }

    if (onProgress) onProgress(100);
    return data.signedUrl as string;
  } finally {
    if (progressInterval) clearInterval(progressInterval);
  }
}

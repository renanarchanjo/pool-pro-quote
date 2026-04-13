import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a PDF blob to the "proposals" storage bucket and returns a signed URL (48h TTL).
 * Uses the Supabase SDK directly — handles auth and request format automatically.
 */
export async function savePdfToStorage(
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const fileName = `proposal-${proposalId}.pdf`;

  // Simulate progress since the SDK doesn't expose upload progress
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let currentProgress = 0;

  if (onProgress) {
    onProgress(0);
    progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 12, 85);
      onProgress(currentProgress);
    }, 250);
  }

  try {
    const { error } = await supabase.storage
      .from("proposals")
      .upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage error: ${error.message}`);
    }

    if (onProgress) onProgress(90);

    const { data: signedData, error: signError } = await supabase.storage
      .from("proposals")
      .createSignedUrl(fileName, 172800);

    if (signError || !signedData?.signedUrl) {
      throw new Error(`Signed URL error: ${signError?.message || "unknown"}`);
    }

    if (onProgress) onProgress(100);
    return signedData.signedUrl;
  } finally {
    if (progressInterval) clearInterval(progressInterval);
  }
}

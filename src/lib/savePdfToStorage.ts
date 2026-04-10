import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a PDF blob to the "proposals" storage bucket and returns the public URL.
 */
export async function savePdfToStorage(
  proposalId: string,
  pdfBlob: Blob
): Promise<string> {
  const fileName = `proposal-${proposalId}-${Date.now()}.pdf`;

  const { error } = await supabase.storage
    .from("proposals")
    .upload(fileName, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw new Error(`Storage error: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from("proposals")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

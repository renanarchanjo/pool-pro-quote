import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a PDF blob to the "proposals" storage bucket and returns a signed URL (48h TTL).
 * Uses anonymous client (no auth required) since the simulator is public.
 * Uses a fixed filename per proposal to avoid duplicates (upsert overwrites previous).
 */
export async function savePdfToStorage(
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const fileName = `proposal-${proposalId}.pdf`;

  if (onProgress) {
    // Use XMLHttpRequest for progress tracking
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/proposals/${fileName}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", "application/pdf");
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("x-upsert", "true");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Storage upload error: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(pdfBlob);
    });
  } else {
    const { error } = await supabase.storage
      .from("proposals")
      .upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) throw new Error(`Storage error: ${error.message}`);
  }

  // Return signed URL with 48h TTL instead of permanent public URL
  const { data: signedData, error: signError } = await supabase.storage
    .from("proposals")
    .createSignedUrl(fileName, 172800); // 48 hours

  if (signError || !signedData?.signedUrl) {
    throw new Error(`Signed URL error: ${signError?.message || "unknown"}`);
  }

  return signedData.signedUrl;
}

import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Uploads a PDF blob to the "proposals" storage bucket and returns a signed URL (48h TTL).
 * Path format: {storeId}/{proposalId}.pdf
 */
export async function savePdfToStorage(
  storeId: string,
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const fileName = `${storeId}/${proposalId}.pdf`;

  if (onProgress) {
    // Use authenticated session token for XHR upload
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || supabaseAnonKey;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/proposals/${fileName}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", "application/pdf");
      xhr.setRequestHeader("apikey", supabaseAnonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("x-upsert", "true");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          const responseDetails = xhr.responseText?.trim();
          reject(
            new Error(
              `Storage upload error: ${xhr.status} ${xhr.statusText}${responseDetails ? ` - ${responseDetails}` : ""}`,
            ),
          );
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

    if (error) {
      console.error("Storage upload error details:", error);
      Sentry.captureException(error, {
        tags: { feature: "pdf_upload" },
        extra: { storeId, proposalId, fileName },
      });
      throw new Error(`Storage error: ${error.message}`);
    }
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from("proposals")
    .createSignedUrl(fileName, 172800);

  if (signError || !signedData?.signedUrl) {
    const err = new Error(`Signed URL error: ${signError?.message || "unknown"}`);
    Sentry.captureException(err, {
      tags: { feature: "pdf_signed_url" },
      extra: { storeId, proposalId, fileName },
    });
    throw err;
  }

  return signedData.signedUrl;
}

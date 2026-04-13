import { supabase } from "@/integrations/supabase/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Get the best available auth token: session token if logged in, anon key otherwise */
async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || supabaseAnonKey || "";
}

/**
 * Uploads a PDF blob to the "proposals" storage bucket and returns a signed URL (48h TTL).
 * Uses session token when available, falls back to anon key for public simulator.
 */
export async function savePdfToStorage(
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuração do Supabase ausente. Verifique as variáveis de ambiente.");
  }

  const fileName = `proposal-${proposalId}.pdf`;
  const token = await getAuthToken();

  if (onProgress) {
    const uploadUrl = `${supabaseUrl}/storage/v1/object/proposals/${fileName}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", "application/pdf");
      xhr.setRequestHeader("apikey", supabaseAnonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
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
      throw new Error(`Storage error: ${error.message}`);
    }
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from("proposals")
    .createSignedUrl(fileName, 172800);

  if (signError || !signedData?.signedUrl) {
    throw new Error(`Signed URL error: ${signError?.message || "unknown"}`);
  }

  return signedData.signedUrl;
}

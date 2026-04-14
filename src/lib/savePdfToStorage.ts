import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

/**
 * Gets the best available access token.
 * Returns session token if authenticated, or anon key for public flows.
 */
async function getBestAccessToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      const expiresAt = session.expires_at ?? 0;
      const nowSecs = Math.floor(Date.now() / 1000);
      if (expiresAt > nowSecs + 60) {
        console.log("[WPP] 4. Usando token de sessão autenticada");
        return session.access_token;
      }

      // Try refresh
      console.log("[WPP] 4. Token próximo de expirar, tentando refresh...");
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session?.access_token) {
        console.log("[WPP] 4. Sessão renovada com sucesso");
        return refreshData.session.access_token;
      }
    }
  } catch (e) {
    console.warn("[WPP] 4. Erro ao obter sessão:", e);
  }

  // Fallback: use anon key (public flow — relies on storage policies)
  console.log("[WPP] 4. Sem sessão autenticada, usando anon key (fluxo público)");
  return supabaseAnonKey;
}

/**
 * Performs the actual upload via XHR with progress tracking.
 */
function uploadWithProgress(
  uploadUrl: string,
  accessToken: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "true");

    // Timeout: 30 seconds
    xhr.timeout = 30000;
    xhr.ontimeout = () => reject(new Error("Upload timeout (30s)"));

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

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
}

/**
 * Uploads a PDF blob to the "proposals" storage bucket and returns a signed URL (48h TTL).
 * Path format: {storeId}/{proposalId}.pdf
 *
 * Includes: session refresh, retry with backoff, timeout protection.
 */
export async function savePdfToStorage(
  storeId: string,
  proposalId: string,
  pdfBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const fileName = `${storeId}/${proposalId}.pdf`;

  // Validate blob before attempting upload
  if (!pdfBlob || pdfBlob.size === 0) {
    throw new Error("PDF inválido: blob vazio ou nulo");
  }
  if (pdfBlob.size > 20 * 1024 * 1024) {
    throw new Error("PDF muito grande (>20MB). Tente reduzir a qualidade.");
  }

  console.log("[WPP] 4. Blob válido:", pdfBlob.size, "bytes. Obtendo sessão...");

  // Get best available access token (auth or anon fallback)
  const accessToken = await getBestAccessToken();

  const uploadUrl = `${supabaseUrl}/storage/v1/object/proposals/${fileName}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[WPP] 4. Upload tentativa ${attempt}/${MAX_RETRIES}...`);

      if (onProgress) {
        await uploadWithProgress(uploadUrl, accessToken, pdfBlob, onProgress);
      } else {
        const { error } = await supabase.storage
          .from("proposals")
          .upload(fileName, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (error) throw new Error(`Storage error: ${error.message}`);
      }

      console.log("[WPP] 4. Upload concluído com sucesso");
      break; // success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[WPP] 4. Upload falhou (tentativa ${attempt}):`, lastError.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1] || 2000;
        console.log(`[WPP] 4. Aguardando ${delay}ms antes de retry...`);
        await new Promise((r) => setTimeout(r, delay));

        // Reset progress for retry
        if (onProgress) onProgress(0);
      } else {
        Sentry.captureException(lastError, {
          tags: { feature: "pdf_upload" },
          extra: { storeId, proposalId, fileName, attempts: attempt },
        });
        throw lastError;
      }
    }
  }

  // Generate signed URL
  const { data: signedData, error: signError } = await supabase.storage
    .from("proposals")
    .createSignedUrl(fileName, 172800); // 48h

  if (signError || !signedData?.signedUrl) {
    const err = new Error(`Signed URL error: ${signError?.message || "unknown"}`);
    Sentry.captureException(err, {
      tags: { feature: "pdf_signed_url" },
      extra: { storeId, proposalId, fileName },
    });
    throw err;
  }

  console.log("[WPP] 4. Signed URL gerada:", signedData.signedUrl.substring(0, 80) + "...");
  return signedData.signedUrl;
}

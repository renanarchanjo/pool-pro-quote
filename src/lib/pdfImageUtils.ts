import { pdfImageCacheGet, pdfImageCacheSet } from "@/hooks/usePdfImageCache";

const toBase64ViaCanvas = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = url + (url.includes("?") ? "&" : "?") + "_pdf=" + Date.now();
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const toBase64ViaFetch = async (url: string): Promise<string> => {
  const res = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    cache: "no-cache",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return blobToDataUrl(blob);
};

export const PDF_IMAGE_FALLBACK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const RETRY_DELAYS = [0, 500, 1500]; // 3 attempts with exponential backoff

const toBase64ViaFetchWithRetry = async (url: string, fetchOptions?: RequestInit): Promise<string> => {
  let lastError: unknown;
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    if (RETRY_DELAYS[i] > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]));
    }
    try {
      if (fetchOptions) {
        const res = await fetch(url, fetchOptions);
        if (res.ok) {
          const blob = await res.blob();
          return await blobToDataUrl(blob);
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return await toBase64ViaFetch(url);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
};

export const toBase64Safe = async (url: string): Promise<string> => {
  if (!url) return PDF_IMAGE_FALLBACK;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // Check IndexedDB cache first
  const cached = await pdfImageCacheGet(url);
  if (cached) return cached;

  let result: string | null = null;

  // ── PostImg.cc: special handling (restricted CORS + referrer blocking) ──
  const isPostImg = url.includes("postimg.cc") || url.includes("postimages.org");
  if (isPostImg) {
    // 1) Canvas with referrerPolicy
    try {
      const canvasResult = await toBase64ViaCanvas(url);
      if (canvasResult && !canvasResult.startsWith("data:image/png;base64,iVBOR")) {
        result = canvasResult;
      }
    } catch { /* silent */ }

    if (!result) {
      // 2) Fetch with no-referrer + retry
      try {
        result = await toBase64ViaFetchWithRetry(url, {
          mode: "cors",
          referrerPolicy: "no-referrer",
          credentials: "omit",
        });
      } catch { /* silent */ }
    }

    if (!result) {
      // 3) Last resort: img tag with no-referrer
      result = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.referrerPolicy = "no-referrer";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          try {
            resolve(canvas.toDataURL("image/png"));
          } catch {
            resolve(PDF_IMAGE_FALLBACK);
          }
        };
        img.onerror = () => resolve(PDF_IMAGE_FALLBACK);
        img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
      });
    }

    if (result && result !== PDF_IMAGE_FALLBACK) {
      await pdfImageCacheSet(url, result);
    }
    return result || PDF_IMAGE_FALLBACK;
  }

  // ── Standard flow with retry ──
  try {
    result = await toBase64ViaFetchWithRetry(url);
  } catch { /* silent */ }

  if (!result) {
    try {
      result = await toBase64ViaCanvas(url);
    } catch { /* silent */ }
  }

  // Try Supabase public URL rewrite
  if (!result) {
    try {
      const publicUrl = url.includes("supabase")
        ? url.replace("/storage/v1/object/", "/storage/v1/object/public/")
        : url;
      result = await toBase64ViaFetchWithRetry(publicUrl);
    } catch { /* silent */ }
  }

  if (!result) {
    console.warn("[PDF] Imagem não carregou:", url);
    return PDF_IMAGE_FALLBACK;
  }

  await pdfImageCacheSet(url, result);
  return result;
};

const waitForImageReady = async (img: HTMLImageElement): Promise<void> => {
  if (img.complete && img.naturalWidth > 0) return;
  await new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
};

interface ImageSnapshot {
  image: HTMLImageElement;
  originalSrc: string | null;
  originalSrcset: string | null;
  originalLoading: string | null;
  originalCrossOrigin: string | null;
}

export const inlineImagesForPdf = async (root: HTMLElement): Promise<() => void> => {
  const images = Array.from(root.querySelectorAll("img"));
  const snapshots: ImageSnapshot[] = [];

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src") || img.currentSrc || img.src;
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;

      snapshots.push({
        image: img,
        originalSrc: img.getAttribute("src"),
        originalSrcset: img.getAttribute("srcset"),
        originalLoading: img.getAttribute("loading"),
        originalCrossOrigin: img.getAttribute("crossorigin"),
      });

      const base64 = await toBase64Safe(src);
      // Only replace src if we got a real base64, not the 1x1 fallback
      if (base64 && base64 !== PDF_IMAGE_FALLBACK) {
        img.removeAttribute("srcset");
        img.removeAttribute("crossorigin");
        img.setAttribute("loading", "eager");
        img.src = base64;
        await waitForImageReady(img);
      } else {
        // Keep original src but ensure CORS and eager loading for html2canvas
        img.setAttribute("crossorigin", "anonymous");
        img.setAttribute("loading", "eager");
        console.warn("[PDF] Keeping original src (base64 failed):", src);
      }
      img.style.visibility = "visible";
      if (!img.style.display || img.style.display === "none") {
        img.style.display = "inline";
      }
    }),
  );

  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 500));

  return () => {
    snapshots.forEach(({ image, originalSrc, originalSrcset, originalLoading, originalCrossOrigin }) => {
      if (originalSrc === null) image.removeAttribute("src");
      else image.setAttribute("src", originalSrc);
      if (originalSrcset === null) image.removeAttribute("srcset");
      else image.setAttribute("srcset", originalSrcset);
      if (originalLoading === null) image.removeAttribute("loading");
      else image.setAttribute("loading", originalLoading);
      if (originalCrossOrigin === null) image.removeAttribute("crossorigin");
      else image.setAttribute("crossorigin", originalCrossOrigin);
    });
  };
};

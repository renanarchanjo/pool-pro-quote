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

const toBase64ViaFetch = async (url: string, fetchOptions?: RequestInit): Promise<string> => {
  const res = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    cache: "no-cache",
    ...fetchOptions,
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
      return await toBase64ViaFetch(url, fetchOptions);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
};

const getPlaceholderText = (text: string) =>
  (text || "Imagem").trim().replace(/\s+/g, " ").slice(0, 24) || "Imagem";

export const textToBase64Placeholder = async (
  text: string,
  width: number,
  height: number,
): Promise<string> => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(Math.round(width || 0), 80);
  canvas.height = Math.max(Math.round(height || 0), 30);

  const ctx = canvas.getContext("2d");
  if (!ctx) return PDF_IMAGE_FALLBACK;

  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = `${Math.min(12, Math.max(10, canvas.height * 0.4))}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(getPlaceholderText(text), canvas.width / 2, canvas.height / 2, canvas.width - 12);

  return canvas.toDataURL("image/png");
};

export const toBase64Safe = async (url: string): Promise<string> => {
  if (!url) return PDF_IMAGE_FALLBACK;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const cached = await pdfImageCacheGet(url);
  if (cached) return cached;

  let result: string | null = null;

  // --- Supabase Storage: fetch direto com CORS (buckets públicos) ---
  const isSupabaseStorage = url.includes("supabase.co") || url.includes("supabase.in");
  if (isSupabaseStorage) {
    // Garante URL pública
    const publicUrl = url.includes("/storage/v1/object/public/")
      ? url
      : url.replace("/storage/v1/object/", "/storage/v1/object/public/");

    try {
      const res = await fetch(publicUrl, {
        mode: "cors",
        credentials: "omit",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      result = await blobToDataUrl(blob);
    } catch {
      // fallback: tenta URL original
      try {
        const res2 = await fetch(url, {
          mode: "cors",
          credentials: "omit",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const blob2 = await res2.blob();
        result = await blobToDataUrl(blob2);
      } catch {
        console.warn("[PDF] Supabase Storage fetch falhou:", url);
      }
    }

    if (result && result !== PDF_IMAGE_FALLBACK) {
      await pdfImageCacheSet(url, result);
      return result;
    }
    // Se falhou, continua para os fallbacks genéricos abaixo
  }

  const isPostImg = url.includes("postimg.cc") || url.includes("postimages.org");
  if (isPostImg) {
    try {
      const canvasResult = await toBase64ViaCanvas(url);
      if (canvasResult && !canvasResult.startsWith("data:image/png;base64,iVBOR")) {
        result = canvasResult;
      }
    } catch {
      /* silent */
    }

    if (!result) {
      try {
        result = await toBase64ViaFetchWithRetry(url, {
          mode: "cors",
          referrerPolicy: "no-referrer",
          credentials: "omit",
          cache: "no-cache",
        });
      } catch {
        /* silent */
      }
    }

    if (!result) {
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

  try {
    result = await toBase64ViaFetchWithRetry(url);
  } catch {
    /* silent */
  }

  if (!result) {
    try {
      result = await toBase64ViaCanvas(url);
    } catch {
      /* silent */
    }
  }

  if (!result) {
    try {
      result = await toBase64ViaFetchWithRetry(url, {
        mode: "cors",
        referrerPolicy: "no-referrer",
        credentials: "omit",
        cache: "no-cache",
      });
    } catch {
      /* silent */
    }
  }

  if (!result) {
    try {
      const publicUrl = url.includes("supabase")
        ? url.replace("/storage/v1/object/", "/storage/v1/object/public/")
        : url;
      result = await toBase64ViaFetchWithRetry(publicUrl);
    } catch {
      /* silent */
    }
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

      let resolvedSrc = await toBase64Safe(src);

      if (!resolvedSrc || resolvedSrc === PDF_IMAGE_FALLBACK) {
        try {
          resolvedSrc = await toBase64ViaFetchWithRetry(src, {
            mode: "cors",
            referrerPolicy: "no-referrer",
            credentials: "omit",
            cache: "no-cache",
          });
        } catch {
          /* silent */
        }
      }

      if (!resolvedSrc || resolvedSrc === PDF_IMAGE_FALLBACK) {
        resolvedSrc = await textToBase64Placeholder(
          img.getAttribute("alt") || "Imagem",
          img.offsetWidth || img.clientWidth || img.naturalWidth || 120,
          img.offsetHeight || img.clientHeight || img.naturalHeight || 40,
        );
        console.warn("[PDF] Usando placeholder visível para:", src);
      }

      img.removeAttribute("srcset");
      img.removeAttribute("crossorigin");
      img.setAttribute("loading", "eager");
      img.src = resolvedSrc;
      await waitForImageReady(img);

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

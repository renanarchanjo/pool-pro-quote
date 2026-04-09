/**
 * PDF Image Utilities
 *
 * Converts all <img> elements inside a root element to inline base64 data URIs
 * so that html2canvas / jsPDF can render them without CORS issues.
 */

// ─── helpers ───────────────────────────────────────────────────────────

const toBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Not an image");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const toBase64ViaProxy = async (url: string): Promise<string> => {
  const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-image-proxy?url=${encodeURIComponent(url)}`;

  const response = await fetch(proxyUrl, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Proxy returned non-image");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/** Try direct fetch first, then proxy, then return transparent fallback */
export const toBase64Safe = async (url: string): Promise<string> => {
  // Transparent 1×1 PNG fallback
  const FALLBACK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  try {
    return await toBase64(url);
  } catch {
    try {
      return await toBase64ViaProxy(url);
    } catch {
      console.warn("[PDF] Imagem não carregou, usando fallback:", url);
      return FALLBACK;
    }
  }
};

const waitForImageReady = async (image: HTMLImageElement): Promise<void> => {
  if (image.complete && image.naturalWidth > 0) {
    try {
      await image.decode();
    } catch {
      // ignore decode errors — image is still usable
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });

  try {
    await image.decode();
  } catch {
    // ignore decode errors — image is still usable
  }
};

// ─── snapshot type ─────────────────────────────────────────────────────

interface ImageSnapshot {
  image: HTMLImageElement;
  originalSrc: string | null;
  originalSrcset: string | null;
  originalLoading: string | null;
  originalCrossOrigin: string | null;
}

// ─── main API ──────────────────────────────────────────────────────────

/**
 * Scans all `<img>` inside `root`, converts remote sources to base64 data URIs,
 * waits for every image to decode, then returns a restore function.
 */
export const inlineImagesForPdf = async (root: HTMLElement): Promise<() => void> => {
  const images = Array.from(root.querySelectorAll("img"));
  const snapshots: ImageSnapshot[] = [];

  await Promise.all(
    images.map(async (image) => {
      const source = image.currentSrc || image.getAttribute("src") || image.src;

      // Skip images that are already inline
      if (!source || source.startsWith("data:") || source.startsWith("blob:")) {
        return;
      }

      // Save original attributes
      snapshots.push({
        image,
        originalSrc: image.getAttribute("src"),
        originalSrcset: image.getAttribute("srcset"),
        originalLoading: image.getAttribute("loading"),
        originalCrossOrigin: image.getAttribute("crossorigin"),
      });

      // Convert to base64
      const base64 = await toBase64Safe(source);

      image.removeAttribute("srcset");
      image.setAttribute("loading", "eager");
      image.removeAttribute("crossorigin");
      image.src = base64;

      await waitForImageReady(image);
    }),
  );

  // Return restore function
  return () => {
    snapshots.forEach(({ image, originalSrc, originalSrcset, originalLoading, originalCrossOrigin }) => {
      if (originalSrc === null) {
        image.removeAttribute("src");
      } else {
        image.setAttribute("src", originalSrc);
      }

      if (originalSrcset === null) {
        image.removeAttribute("srcset");
      } else {
        image.setAttribute("srcset", originalSrcset);
      }

      if (originalLoading === null) {
        image.removeAttribute("loading");
      } else {
        image.setAttribute("loading", originalLoading);
      }

      if (originalCrossOrigin === null) {
        image.removeAttribute("crossorigin");
      } else {
        image.setAttribute("crossorigin", originalCrossOrigin);
      }
    });
  };
};

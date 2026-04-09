import { supabase } from "@/integrations/supabase/client";

const waitForImageLoad = async (image: HTMLImageElement) => {
  if (image.complete && image.naturalWidth > 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    const cleanup = () => {
      image.removeEventListener("load", handleDone);
      image.removeEventListener("error", handleDone);
    };

    const handleDone = () => {
      cleanup();
      resolve();
    };

    image.addEventListener("load", handleDone, { once: true });
    image.addEventListener("error", handleDone, { once: true });
  });
};

interface PreparedImageSnapshot {
  image: HTMLImageElement;
  originalSrc: string | null;
  originalSrcset: string | null;
  objectUrl: string;
}

const buildFetchSources = (source: string) => {
  const encodedSource = encodeURIComponent(source);
  const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-image-proxy?url=${encodedSource}`;

  return [source, proxyUrl];
};

const fetchImageBlob = async (source: string) => {
  const candidates = buildFetchSources(source);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
        headers: candidate === source
          ? undefined
          : {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
      });

      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("Arquivo recebido não é uma imagem válida");
      }

      return blob;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Não foi possível baixar a imagem");
};

export const inlineImagesForPdf = async (root: HTMLElement): Promise<() => void> => {
  const images = Array.from(root.querySelectorAll("img"));
  const snapshots: PreparedImageSnapshot[] = [];

  await Promise.all(
    images.map(async (image) => {
      const source = image.currentSrc || image.getAttribute("src") || image.src;

      if (!source || source.startsWith("data:") || source.startsWith("blob:")) {
        await waitForImageLoad(image);
        return;
      }

      try {
        const blob = await fetchImageBlob(source);
        const objectUrl = URL.createObjectURL(blob);
        snapshots.push({
          image,
          originalSrc: image.getAttribute("src"),
          originalSrcset: image.getAttribute("srcset"),
          objectUrl,
        });

        image.setAttribute("crossorigin", "anonymous");
        image.removeAttribute("srcset");
        image.src = objectUrl;

        await waitForImageLoad(image);
      } catch (error) {
        console.warn("Não foi possível preparar imagem para PDF:", source, error);
        await waitForImageLoad(image);
      }
    }),
  );

  return () => {
    snapshots.forEach(({ image, originalSrc, originalSrcset, objectUrl }) => {
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

      URL.revokeObjectURL(objectUrl);
    });
  };
};
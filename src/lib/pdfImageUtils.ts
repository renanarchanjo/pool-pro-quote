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

const toBase64ViaFetch = async (url: string): Promise<string> => {

  const res = await fetch(url, {

    mode: "cors",

    credentials: "omit",

    cache: "no-cache",

  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const blob = await res.blob();

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result as string);

    reader.onerror = reject;

    reader.readAsDataURL(blob);

  });

};

const FALLBACK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export const toBase64Safe = async (url: string): Promise<string> => {

  if (!url) return FALLBACK;

  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // Tenta fetch direto primeiro

  try {

    return await toBase64ViaFetch(url);

  } catch {

    // Silencioso

  }

  // Tenta via canvas

  try {

    return await toBase64ViaCanvas(url);

  } catch {

    // Silencioso

  }

  // Tenta adicionar o storage do Supabase como URL pública direta

  try {

    const publicUrl = url.includes("supabase") 

      ? url.replace("/storage/v1/object/", "/storage/v1/object/public/")

      : url;

    return await toBase64ViaFetch(publicUrl);

  } catch {

    // Silencioso

  }

  console.warn("[PDF] Imagem não carregou:", url);

  return FALLBACK;

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

      // Pega o src mais confiável — getAttribute é mais estável que currentSrc

      const src =

        img.getAttribute("src") ||

        img.currentSrc ||

        img.src;

      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;

      snapshots.push({

        image: img,

        originalSrc: img.getAttribute("src"),

        originalSrcset: img.getAttribute("srcset"),

        originalLoading: img.getAttribute("loading"),

        originalCrossOrigin: img.getAttribute("crossorigin"),

      });

      const base64 = await toBase64Safe(src);

      // Aplica base64 e espera o browser renderizar

      img.removeAttribute("srcset");

      img.removeAttribute("crossorigin");

      img.setAttribute("loading", "eager");

      img.src = base64;

      await waitForImageReady(img);

      // Força repaint

      img.style.visibility = "visible";

      img.style.display = img.style.display || "inline";

    }),

  );

  // Aguarda todos os repaints

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
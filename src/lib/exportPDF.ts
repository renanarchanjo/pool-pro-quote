import html2canvas from "html2canvas-pro";
import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { inlineImagesForPdf } from "@/lib/pdfImageUtils";

interface ExportPDFOptions {
  element: HTMLElement;
  filename: string;
  orientation?: "portrait" | "landscape";
  /** Optional fixed width hint for non-template callers */
  captureWidth?: number;
  /** Capture each matching section separately to avoid broken page splits */
  sectionSelector?: string;
}

const A4_SIZES = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
} as const;

const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const getHtml2canvasScale = (): number => {
  // Resolução alta para texto nítido sem precisar dar zoom no PDF
  return isMobileDevice() ? 2 : 2.5;
};

const getMobileCaptureWidth = (): number | null => {
  return isMobileDevice() ? 390 : null;
};

const waitForStablePaint = async (delay?: number) => {
  const d = delay ?? (isMobileDevice() ? 500 : 150);
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, d));
};

const HTML2CANVAS_TIMEOUT = 30000;

const disableAncestorTransformsForPdf = (element: HTMLElement) => {
  const changed: Array<{ el: HTMLElement; transform: string; width: string; margin: string; overflow: string; overflowX: string; overflowY: string }> = [];
  let current = element.parentElement;

  while (current && current !== document.body) {
    const computed = window.getComputedStyle(current);
    const hasTransform = computed.transform !== "none";
    const clipsCapture = computed.overflowX === "hidden" || computed.overflowY === "hidden";

    if (hasTransform || clipsCapture) {
      changed.push({
        el: current,
        transform: current.style.transform,
        width: current.style.width,
        margin: current.style.margin,
        overflow: current.style.overflow,
        overflowX: current.style.overflowX,
        overflowY: current.style.overflowY,
      });
      if (hasTransform) {
        current.style.transform = "none";
        current.style.width = "794px";
        current.style.margin = "0 auto";
      }
      current.style.overflow = "visible";
      current.style.overflowX = "visible";
      current.style.overflowY = "visible";
    }
    current = current.parentElement;
  }

  return () => {
    changed.reverse().forEach(({ el, transform, width, margin, overflow, overflowX, overflowY }) => {
      el.style.transform = transform;
      el.style.width = width;
      el.style.margin = margin;
      el.style.overflow = overflow;
      el.style.overflowX = overflowX;
      el.style.overflowY = overflowY;
    });
  };
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout (${ms}ms) ao capturar: ${label}`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

const exportSectionedPDF = async ({
  element,
  filename,
  orientation,
  sectionSelector,
}: Required<Pick<ExportPDFOptions, "element" | "filename" | "orientation" | "sectionSelector">>) => {
  const page = A4_SIZES[orientation];
  const sections = Array.from(element.querySelectorAll<HTMLElement>(sectionSelector)).filter(
    (s) => s.offsetWidth > 0 && s.offsetHeight > 0,
  );

  console.log("[PDF] sections encontradas:", sections.length);

  if (sections.length === 0) {
    throw new Error(`Nenhuma seção encontrada para o seletor ${sectionSelector}`);
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });
  const scale = getHtml2canvasScale();
  const fullPageCapture = sections.every((s) => s.hasAttribute("data-pdf-page"));

  if (fullPageCapture) {
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      // Neutraliza clip/clipPath herdado de wrappers offscreen (impedem captura correta no mobile)
      const savedClip = section.style.clip;
      const savedClipPath = section.style.clipPath;
      const savedTransform = section.style.transform;
      section.style.clip = "auto";
      section.style.clipPath = "none";
      section.style.transform = "none";
      const captureWidth = Math.max(section.offsetWidth, section.scrollWidth, 794);
      const captureHeight = Math.max(section.offsetHeight, section.scrollHeight);
      console.log("[PDF] capturando seção", index, "— tamanho:", captureWidth, "x", captureHeight);
      const canvas = await withTimeout(
        html2canvas(section, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
          scrollX: 0,
          scrollY: -window.scrollY,
        }),
        HTML2CANVAS_TIMEOUT,
        `seção ${index}`,
      ).catch((err: unknown) => {
        console.error("[PDF] ERRO no html2canvas seção", index, ":", err);
        section.style.clip = savedClip;
        section.style.clipPath = savedClipPath;
        section.style.transform = savedTransform;
        throw err;
      });
      section.style.clip = savedClip;
      section.style.clipPath = savedClipPath;
      section.style.transform = savedTransform;
      console.log("[PDF] canvas gerado:", canvas.width, "x", canvas.height);

      if (index > 0) {
        pdf.addPage("a4", orientation);
      }

      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, page.width, page.height, undefined, "FAST");
    }

    return pdf;
  }

  const margin = 10;
  const contentWidth = page.width - margin * 2;
  const contentHeight = page.height - margin * 2;
  const sectionGap = 4;
  let currentY = margin;

  for (const section of sections) {
    section.getBoundingClientRect();
    const canvas = await withTimeout(
      html2canvas(section, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        windowWidth: section.scrollWidth,
        windowHeight: section.scrollHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
      }),
      HTML2CANVAS_TIMEOUT,
      "seção não-paginada",
    );

    const imgWidthMm = contentWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    if (currentY > margin && currentY + imgHeightMm > page.height - margin) {
      pdf.addPage("a4", orientation);
      currentY = margin;
    }

    if (imgHeightMm <= contentHeight) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.75), "JPEG", margin, currentY, imgWidthMm, imgHeightMm);
      currentY += imgHeightMm + sectionGap;
      continue;
    }

    const pxPerMm = canvas.width / imgWidthMm;
    const pageSliceHeightPx = Math.floor(contentHeight * pxPerMm);
    let sourceY = 0;

    while (sourceY < canvas.height) {
      const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - sourceY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;

      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Falha ao preparar página do PDF");

      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.75), "JPEG", margin, currentY, imgWidthMm, sliceHeightMm);
      sourceY += sliceHeightPx;

      if (sourceY < canvas.height) {
        pdf.addPage("a4", orientation);
        currentY = margin;
      } else {
        currentY += sliceHeightMm + sectionGap;
      }
    }
  }

  return pdf;
};

export const exportPDF = async ({
  element,
  filename,
  orientation = "portrait",
  captureWidth,
  sectionSelector,
}: ExportPDFOptions): Promise<void> => {
  const pdfHeaders = element.querySelectorAll<HTMLElement>("[data-pdf-header]");
  const pdfOnlyEls = element.querySelectorAll<HTMLElement>("[data-pdf-only]");
  const interactiveEls = element.querySelectorAll<HTMLElement>("button, [data-no-pdf], select");
  const hiddenOriginals: { el: HTMLElement; display: string }[] = [];
  let restoreImages = () => {};
  let restoreCaptureLayout = () => {};

  try {
    toast.info("Gerando PDF...", { duration: 3000 });

    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    }

    restoreCaptureLayout = disableAncestorTransformsForPdf(element);
    pdfHeaders.forEach((el) => {
      hiddenOriginals.push({ el, display: el.style.display });
      el.style.display = "block";
    });
    pdfOnlyEls.forEach((el) => {
      hiddenOriginals.push({ el, display: el.style.display });
      el.style.display = el.dataset.pdfOnlyDisplay || "flex";
    });
    interactiveEls.forEach((el) => {
      hiddenOriginals.push({ el, display: el.style.display });
      el.style.display = "none";
    });

    restoreImages = await inlineImagesForPdf(element);
    await waitForStablePaint();

    if (sectionSelector) {
      const pdf = await exportSectionedPDF({ element, filename, orientation, sectionSelector });
      pdf.save(filename);
    } else {
      const scale = getHtml2canvasScale();
      const width = captureWidth || element.scrollWidth;
      await (html2pdf() as any)
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.92 },
          html2canvas: {
            scale,
            useCORS: true,
            allowTaint: false,
            width,
            windowWidth: width,
            windowHeight: element.scrollHeight,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 15000,
            scrollX: 0,
            scrollY: -window.scrollY,
          },
          jsPDF: { unit: "mm", format: "a4", orientation },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(element)
        .save();
    }

    toast.success("PDF exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  } finally {
    restoreImages();
    restoreCaptureLayout();
    hiddenOriginals.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
};

export const generatePDFBlob = async ({
  element,
  orientation = "portrait",
  captureWidth,
  sectionSelector,
}: Omit<ExportPDFOptions, "filename">): Promise<Blob> => {
  const pdfHeaders = element.querySelectorAll<HTMLElement>("[data-pdf-header]");
  const pdfOnlyEls = element.querySelectorAll<HTMLElement>("[data-pdf-only]");
  const interactiveEls = element.querySelectorAll<HTMLElement>("button, [data-no-pdf], select");
  const hiddenOriginals: { el: HTMLElement; display: string }[] = [];
  let restoreImages = () => {};
  let restoreCaptureLayout = () => {};

  const mobile = isMobileDevice();
  const mobileWidth = getMobileCaptureWidth();
  const savedStyles = { width: element.style.width, fontSize: element.style.fontSize };

  try {
    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    }

    restoreCaptureLayout = disableAncestorTransformsForPdf(element);
    pdfHeaders.forEach((el) => {
      hiddenOriginals.push({ el, display: el.style.display });
      el.style.display = "block";
    });
    pdfOnlyEls.forEach((el) => {
      hiddenOriginals.push({ el, display: el.style.display });
      el.style.display = el.dataset.pdfOnlyDisplay || "flex";
    });
    interactiveEls.forEach((el) => {
      hiddenOriginals.push({ el, display: el.style.display });
      el.style.display = "none";
    });

    // Mobile: only shrink generic captures. Fixed PDF templates must stay at 794px.
    if (!sectionSelector && mobile && mobileWidth) {
      element.style.width = `${mobileWidth}px`;
      element.style.fontSize = "10px";
    }

    restoreImages = await inlineImagesForPdf(element);
    await waitForStablePaint();

    if (sectionSelector) {
      const pdf = await exportSectionedPDF({
        element,
        filename: "temp.pdf",
        orientation,
        sectionSelector,
      });
      return pdf.output("blob") as Blob;
    }

    const scale = getHtml2canvasScale();
    const width = captureWidth || (mobile && mobileWidth ? mobileWidth : element.scrollWidth);
    const blob = await (html2pdf() as any)
      .set({
        margin: [10, 10, 10, 10],
        image: { type: "jpeg", quality: mobile ? 0.9 : 0.92 },
        html2canvas: {
          scale,
          useCORS: true,
          allowTaint: false,
          width,
          windowWidth: width,
          windowHeight: element.scrollHeight,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          scrollX: 0,
          scrollY: -window.scrollY,
        },
        jsPDF: { unit: "mm", format: "a4", orientation },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(element)
      .outputPdf("blob");

    return blob as Blob;
  } finally {
    // Restore mobile styles
    if (!sectionSelector && mobile && mobileWidth) {
      element.style.width = savedStyles.width;
      element.style.fontSize = savedStyles.fontSize;
    }
    restoreImages();
    restoreCaptureLayout();
    hiddenOriginals.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
};

import html2canvas from "html2canvas";
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

const getHtml2canvasScale = (): number => {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  return isMobile ? 1.5 : 2;
};

const waitForStablePaint = async (delay = 300) => {
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, delay));
};

/**
 * Sectioned capture: renders each [data-pdf-section] independently,
 * packing them onto A4 pages with automatic page breaks.
 */
const exportSectionedPDF = async ({
  element,
  filename,
  orientation,
  sectionSelector,
}: Required<Pick<ExportPDFOptions, "element" | "filename" | "orientation" | "sectionSelector">>) => {
  const page = A4_SIZES[orientation];
  const margin = 10;
  const contentWidth = page.width - margin * 2;
  const contentHeight = page.height - margin * 2;
  const sectionGap = 4;

  const sections = Array.from(
    element.querySelectorAll<HTMLElement>(sectionSelector),
  ).filter((s) => s.offsetWidth > 0 && s.offsetHeight > 0);

  if (sections.length === 0) {
    throw new Error(`Nenhuma seção encontrada para o seletor ${sectionSelector}`);
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });
  let currentY = margin;
  const scale = getHtml2canvasScale();

  for (const section of sections) {
    section.getBoundingClientRect();
    const canvas = await html2canvas(section, {
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
    });

    const imgWidthMm = contentWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    if (currentY > margin && currentY + imgHeightMm > page.height - margin) {
      pdf.addPage("a4", orientation);
      currentY = margin;
    }

    if (imgHeightMm <= contentHeight) {
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, currentY, imgWidthMm, imgHeightMm);
      currentY += imgHeightMm + sectionGap;
      continue;
    }

    // Large section: slice into pages
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
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, currentY, imgWidthMm, sliceHeightMm);
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

/**
 * Export an HTML element to PDF.
 * The element is expected to already be at the correct capture width (794px for proposals).
 */
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

  try {
    toast.info("Gerando PDF...", { duration: 3000 });

    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    }

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
          image: { type: "jpeg", quality: 0.98 },
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
    hiddenOriginals.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
};

/**
 * Generate a PDF blob from an HTML element.
 */
export const generatePDFBlob = async ({
  element,
  orientation = "portrait",
  sectionSelector,
}: Omit<ExportPDFOptions, "filename">): Promise<Blob> => {
  const pdfHeaders = element.querySelectorAll<HTMLElement>("[data-pdf-header]");
  const pdfOnlyEls = element.querySelectorAll<HTMLElement>("[data-pdf-only]");
  const interactiveEls = element.querySelectorAll<HTMLElement>("button, [data-no-pdf], select");
  const hiddenOriginals: { el: HTMLElement; display: string }[] = [];
  let restoreImages = () => {};

  try {
    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    }

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
      const pdf = await exportSectionedPDF({
        element,
        filename: "temp.pdf",
        orientation,
        sectionSelector,
      });
      return pdf.output("blob") as Blob;
    } else {
      const scale = getHtml2canvasScale();
      const width = element.scrollWidth;
      const blob = await (html2pdf() as any)
        .set({
          margin: [10, 10, 10, 10],
          image: { type: "jpeg", quality: 0.98 },
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
    }
  } finally {
    restoreImages();
    hiddenOriginals.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
};

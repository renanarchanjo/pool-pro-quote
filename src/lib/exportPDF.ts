import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { inlineImagesForPdf } from "@/lib/pdfImageUtils";

interface ExportPDFOptions {
  element: HTMLElement;
  filename: string;
  orientation?: "portrait" | "landscape";
  /** Fixed width for consistent rendering (default: 1100 for landscape, 800 for portrait) */
  captureWidth?: number;
  /** Capture each matching section separately to avoid broken page splits */
  sectionSelector?: string;
}

interface ElementSnapshot {
  cssText: string;
  className: string;
  ariaHidden: string | null;
}

interface AncestorSnapshot {
  el: HTMLElement;
  transform: string;
  width: string;
  marginLeft: string;
  minHeight: string;
}

const A4_SIZES = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
} as const;

const prepareElementForCapture = (element: HTMLElement): ElementSnapshot => {
  const snapshot: ElementSnapshot = {
    cssText: element.style.cssText,
    className: element.className,
    ariaHidden: element.getAttribute("aria-hidden"),
  };

  element.classList.remove("hidden");
  element.removeAttribute("aria-hidden");
  element.style.display = "block";
  element.style.visibility = "visible";
  element.style.opacity = "1";
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.zIndex = "-9999";
  element.style.pointerEvents = "none";
  element.style.overflow = "hidden";
  element.style.clipPath = "inset(0)";

  return snapshot;
};

const restorePreparedElement = (element: HTMLElement, snapshot: ElementSnapshot) => {
  element.style.cssText = snapshot.cssText;
  element.className = snapshot.className;

  if (snapshot.ariaHidden === null) {
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", snapshot.ariaHidden);
  }
};

const resetAncestorTransforms = (element: HTMLElement): AncestorSnapshot[] => {
  const ancestorResets: AncestorSnapshot[] = [];
  let ancestor = element.parentElement;

  while (ancestor) {
    const computed = getComputedStyle(ancestor);
    if (computed.transform !== "none") {
      ancestorResets.push({
        el: ancestor,
        transform: ancestor.style.transform,
        width: ancestor.style.width,
        marginLeft: ancestor.style.marginLeft,
        minHeight: ancestor.style.minHeight,
      });
      ancestor.style.transform = "none";
      ancestor.style.width = "100%";
      ancestor.style.marginLeft = "0";
      ancestor.style.minHeight = "auto";
    }
    ancestor = ancestor.parentElement;
  }

  return ancestorResets;
};

const restoreAncestorTransforms = (ancestorResets: AncestorSnapshot[]) => {
  ancestorResets.forEach(({ el, transform, width, marginLeft, minHeight }) => {
    el.style.transform = transform;
    el.style.width = width;
    el.style.marginLeft = marginLeft;
    el.style.minHeight = minHeight;
  });
};

const getHtml2canvasScale = (): number => {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  return isMobile ? 1.5 : 2;
};

const waitForStablePaint = async (delay = 300) => {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => setTimeout(resolve, delay));
};

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
  const sections = Array.from(element.querySelectorAll<HTMLElement>(sectionSelector)).filter(
    (section) => section.offsetWidth > 0 && section.offsetHeight > 0,
  );

  if (sections.length === 0) {
    throw new Error(`Nenhuma seção encontrada para o seletor ${sectionSelector}`);
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });
  let currentY = margin;

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    section.getBoundingClientRect();
    const canvas = await html2canvas(section, {
      scale: 2,
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

    const pxPerMm = canvas.width / imgWidthMm;
    const pageSliceHeightPx = Math.floor(contentHeight * pxPerMm);
    let sourceY = 0;

    while (sourceY < canvas.height) {
      const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - sourceY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;

      const sliceContext = sliceCanvas.getContext("2d");
      if (!sliceContext) throw new Error("Falha ao preparar página do PDF");

      sliceContext.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx,
      );

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
 * Standardized PDF export with consistent quality, background,
 * cross-origin image preparation, page-break avoidance, and style restoration on error.
 */
export const exportPDF = async ({
  element,
  filename,
  orientation = "landscape",
  captureWidth,
  sectionSelector,
}: ExportPDFOptions): Promise<void> => {
  const width = captureWidth || (orientation === "landscape" ? 1100 : 800);
  const preparedSnapshot = prepareElementForCapture(element);
  const ancestorResets = resetAncestorTransforms(element);

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

    element.style.width = `${width}px`;
    element.style.maxWidth = `${width}px`;
    element.style.padding = "24px";
    element.style.background = "#ffffff";
    element.getBoundingClientRect();

    restoreImages = await inlineImagesForPdf(element);

    await waitForStablePaint();

    if (sectionSelector) {
      const pdf = await exportSectionedPDF({ element, filename, orientation, sectionSelector });
      pdf.save(filename);
    } else {
      await (html2pdf() as any)
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
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
    restorePreparedElement(element, preparedSnapshot);
    hiddenOriginals.forEach(({ el, display }) => {
      el.style.display = display;
    });
    restoreAncestorTransforms(ancestorResets);
  }
};

/**
 * Generates a PDF blob from an HTML element (same logic as exportPDF but returns Blob).
 */
export const generatePDFBlob = async ({
  element,
  orientation = "portrait",
  captureWidth,
  sectionSelector,
}: Omit<ExportPDFOptions, "filename">): Promise<Blob> => {
  const width = captureWidth || (orientation === "landscape" ? 1100 : 800);
  const preparedSnapshot = prepareElementForCapture(element);
  const ancestorResets = resetAncestorTransforms(element);

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

    element.style.width = `${width}px`;
    element.style.maxWidth = `${width}px`;
    element.style.padding = "24px";
    element.style.background = "#ffffff";
    element.getBoundingClientRect();

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
      const blob = await (html2pdf() as any)
        .set({
          margin: [10, 10, 10, 10],
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
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
    restorePreparedElement(element, preparedSnapshot);
    hiddenOriginals.forEach(({ el, display }) => {
      el.style.display = display;
    });
    restoreAncestorTransforms(ancestorResets);
  }
};

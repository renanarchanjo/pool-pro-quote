import html2pdf from "html2pdf.js";
import { toast } from "sonner";

interface ExportPDFOptions {
  element: HTMLElement;
  filename: string;
  orientation?: "portrait" | "landscape";
  /** Fixed width for consistent rendering (default: 1100 for landscape, 800 for portrait) */
  captureWidth?: number;
}

/**
 * Standardized PDF export with consistent quality, background, 
 * page-break avoidance, and style restoration on error.
 */
export const exportPDF = async ({
  element,
  filename,
  orientation = "landscape",
  captureWidth,
}: ExportPDFOptions): Promise<void> => {
  const width = captureWidth || (orientation === "landscape" ? 1100 : 800);

  // Save original styles
  const originalStyle = element.style.cssText;

  try {
    toast.info("Gerando PDF...", { duration: 3000 });

    // Force print-friendly styles
    element.style.width = `${width}px`;
    element.style.maxWidth = `${width}px`;
    element.style.padding = "24px";
    element.style.background = "#ffffff";
    element.style.color = "#000000";

    await (html2pdf() as any)
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          width,
          windowWidth: width,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(element)
      .save();

    toast.success("PDF exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  } finally {
    // Always restore original styles
    element.style.cssText = originalStyle;
  }
};

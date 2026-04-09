import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadRow {
  nome: string;
  whatsapp: string;
  cidade: string;
  estado: string;
  piscina: string;
  valor: number;
  status: string;
  distribuidoPara: string;
  dataEntrada: string;
  dataDistribuicao: string;
}

const STATUS_FILLS: Record<string, { bg: string; fg: string }> = {
  "Nova":           { bg: "E0F2FE", fg: "0369A1" },
  "Enviada":        { bg: "EDE9FE", fg: "5B21B6" },
  "Em Negociação":  { bg: "FEF3C7", fg: "92400E" },
  "Fechada":        { bg: "F0FDF4", fg: "166534" },
  "Perdida":        { bg: "FEF2F2", fg: "991B1B" },
};

const HEADER_BG = "0F172A";
const HEADER_FG = "FFFFFF";
const ALT_ROW = "F8FAFC";
const BORDER_COLOR = "E2E8F0";

const thinBorder: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
const allBorders: Partial<ExcelJS.Borders> = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try { return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return "—"; }
}

export async function exportLeadsXlsx(rows: LeadRow[], fileName?: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SimulaPool";
  wb.created = new Date();

  const ws = wb.addWorksheet("Leads Captados", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
  });

  // Columns
  ws.columns = [
    { header: "Nome do Lead",        key: "nome",              width: 28 },
    { header: "WhatsApp",            key: "whatsapp",          width: 20 },
    { header: "Cidade",              key: "cidade",            width: 18 },
    { header: "Estado",              key: "estado",            width: 8  },
    { header: "Modelo de Piscina",   key: "piscina",           width: 24 },
    { header: "Valor Estimado (R$)", key: "valor",             width: 20 },
    { header: "Status",              key: "status",            width: 16 },
    { header: "Distribuído Para",    key: "distribuidoPara",   width: 24 },
    { header: "Data de Entrada",     key: "dataEntrada",       width: 20 },
    { header: "Data Distribuição",   key: "dataDistribuicao",  width: 20 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = allBorders;
  });

  // Data rows
  rows.forEach((r, i) => {
    const row = ws.addRow({
      nome: r.nome,
      whatsapp: formatPhone(r.whatsapp),
      cidade: r.cidade,
      estado: r.estado,
      piscina: r.piscina || "—",
      valor: r.valor,
      status: r.status,
      distribuidoPara: r.distribuidoPara || "—",
      dataEntrada: formatDate(r.dataEntrada),
      dataDistribuicao: r.dataDistribuicao ? formatDate(r.dataDistribuicao) : "—",
    });

    row.height = 22;
    const isAlt = i % 2 === 1;

    row.eachCell((cell, colNumber) => {
      cell.font = { size: 10, name: "Arial", color: { argb: "1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "left" : "center" };
      cell.border = allBorders;

      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW } };
      }
    });

    // Currency format for valor column (6)
    const valorCell = row.getCell(6);
    valorCell.numFmt = 'R$ #,##0.00';
    valorCell.value = r.valor;
    valorCell.alignment = { vertical: "middle", horizontal: "right" };

    // Status coloring (7)
    const statusCell = row.getCell(7);
    const sf = STATUS_FILLS[r.status];
    if (sf) {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sf.bg } };
      statusCell.font = { size: 10, name: "Arial", bold: true, color: { argb: sf.fg } };
    }
  });

  // Auto-filter on all columns
  ws.autoFilter = { from: "A1", to: `J${rows.length + 1}` };

  // Generate and download
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, fileName || `leads-captados-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

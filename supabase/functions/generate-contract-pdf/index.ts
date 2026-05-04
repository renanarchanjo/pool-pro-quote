// Edge function: generate-contract-pdf
// Generates the contract PDF, uploads it to Storage, updates contract status,
// and returns a signed URL for download.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import { getCorsHeaders } from "../_shared/cors.ts";

interface Body { contract_id: string }

const fmtCurrency = (v: number) => `R$ ${(Number(v) || 0).toFixed(2).replace(".", ",")}`;
const fmtDateBR = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;
    if (!body?.contract_id) {
      return new Response(JSON.stringify({ error: "contract_id obrigatório" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, service);

    // Fetch contract + relations
    const { data: contract, error: cErr } = await admin
      .from("contracts").select("id, store_id").eq("id", body.contract_id).maybeSingle();
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Authorization: caller must belong to the store or be super_admin
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      admin.from("profiles").select("store_id").eq("id", userId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    const isSuper = roleRow?.role === "super_admin";
    const isMember = profile?.store_id === contract.store_id;
    if (!isSuper && !isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const [sellerRes, buyerRes, productRes] = await Promise.all([
      admin.from("contract_seller_data").select("*").eq("contract_id", body.contract_id).maybeSingle(),
      admin.from("contract_buyer_data").select("*").eq("contract_id", body.contract_id).maybeSingle(),
      admin.from("contract_product_data").select("*").eq("contract_id", body.contract_id).maybeSingle(),
    ]);
    const seller: any = sellerRes.data || {};
    const buyer: any = buyerRes.data || {};
    const product: any = productRes.data || {};

    // === PDF (ABNT NBR 14724) ===
    // Margens: superior 3cm, esquerda 3cm, inferior 2cm, direita 2cm
    // Fonte: Times 12pt no corpo / 14pt títulos. Espaçamento 1,5. Justificado.
    // Recuo de primeira linha: 1,25cm. Numeração de páginas no canto superior direito.
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PAGE_W = 210;
    const PAGE_H = 297;
    const M_TOP = 30;
    const M_LEFT = 30;
    const M_RIGHT = 20;
    const M_BOTTOM = 20;
    const W = PAGE_W - M_LEFT - M_RIGHT;
    const INDENT = 12.5; // 1,25 cm
    const FONT = "times";
    const SIZE_BODY = 12;
    const SIZE_TITLE = 14;
    const LINE_FACTOR = 1.5; // espaçamento 1,5 ABNT
    const lineHeight = (size: number) => (size * 0.3528) * LINE_FACTOR; // pt→mm * 1.5

    let y = M_TOP;
    let pageNum = 1;

    const drawPageNumber = () => {
      // ABNT: numeração no canto superior direito a partir da 2ª folha
      if (pageNum > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(10);
        doc.text(String(pageNum), PAGE_W - M_RIGHT, 15, { align: "right" });
      }
    };
    drawPageNumber();

    const newPage = () => {
      doc.addPage();
      pageNum += 1;
      y = M_TOP;
      drawPageNumber();
    };

    const ensureSpace = (h: number) => {
      if (y + h > PAGE_H - M_BOTTOM) newPage();
    };

    // Justified paragraph with optional first-line indent
    const writeParagraph = (
      text: string,
      opts: { size?: number; bold?: boolean; align?: "left" | "center" | "right" | "justify"; indent?: boolean; gapAfter?: number } = {}
    ) => {
      const size = opts.size ?? SIZE_BODY;
      const bold = !!opts.bold;
      const align = opts.align ?? "justify";
      const indent = opts.indent ?? (align === "justify");
      doc.setFont(FONT, bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lh = lineHeight(size);

      // Split honoring indent on the FIRST visual line
      const firstWidth = indent ? W - INDENT : W;
      // Use splitTextToSize for both, but force first line to fit firstWidth
      const allLines = doc.splitTextToSize(text, W) as string[];

      // Re-flow: build lines manually to allow first-line indent + justify
      const words = text.replace(/\s+/g, " ").trim().split(" ");
      const lines: string[] = [];
      let current = "";
      let isFirst = true;
      const widthFor = () => (isFirst && indent ? firstWidth : W);
      for (const w of words) {
        const test = current ? current + " " + w : w;
        if (doc.getTextWidth(test) <= widthFor()) {
          current = test;
        } else {
          lines.push(current);
          current = w;
          isFirst = false;
        }
      }
      if (current) lines.push(current);

      ensureSpace(lines.length * lh + (opts.gapAfter ?? 0));

      lines.forEach((line, idx) => {
        const x = (idx === 0 && indent) ? M_LEFT + INDENT : M_LEFT;
        const isLast = idx === lines.length - 1;

        if (align === "center") {
          doc.text(line, PAGE_W / 2, y, { align: "center" });
        } else if (align === "right") {
          doc.text(line, PAGE_W - M_RIGHT, y, { align: "right" });
        } else if (align === "justify" && !isLast && line.includes(" ")) {
          // Manual justification
          const targetWidth = (idx === 0 && indent) ? firstWidth : W;
          const lineWords = line.split(" ");
          const textWidth = doc.getTextWidth(line);
          const extraSpace = targetWidth - textWidth;
          const gaps = lineWords.length - 1;
          if (gaps > 0 && extraSpace > 0) {
            const spaceWidth = doc.getTextWidth(" ");
            let cursor = x;
            lineWords.forEach((wd, wi) => {
              doc.text(wd, cursor, y);
              if (wi < lineWords.length - 1) {
                cursor += doc.getTextWidth(wd) + spaceWidth + extraSpace / gaps;
              }
            });
          } else {
            doc.text(line, x, y);
          }
        } else {
          doc.text(line, x, y);
        }
        y += lh;
      });
      if (opts.gapAfter) y += opts.gapAfter;
    };

    const writeTitle = (text: string, opts: { size?: number; align?: "left" | "center"; gapBefore?: number; gapAfter?: number } = {}) => {
      const size = opts.size ?? SIZE_TITLE;
      const gapB = opts.gapBefore ?? 4;
      const gapA = opts.gapAfter ?? 3;
      y += gapB;
      writeParagraph(text.toUpperCase(), { size, bold: true, align: opts.align ?? "center", indent: false, gapAfter: gapA });
    };

    const writeSubtitle = (text: string) => {
      y += 3;
      writeParagraph(text, { size: SIZE_BODY, bold: true, align: "left", indent: false, gapAfter: 2 });
    };

    // ===== Capa / Cabeçalho =====
    writeParagraph(seller.company_name || "—", { size: 14, bold: true, align: "center", indent: false, gapAfter: 2 });
    writeParagraph("CONTRATO DE COMPRA E VENDA DE PISCINA E ACESSÓRIOS", { size: 14, bold: true, align: "center", indent: false, gapAfter: 6 });

    // ===== Qualificação das Partes =====
    writeSubtitle("1. DAS PARTES");
    writeParagraph(
      `VENDEDOR(A): ${seller.company_name || "—"}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${seller.cnpj || "—"}, com sede na ${seller.address || "—"}, ${seller.city || "—"} – ${seller.state || "—"}, CEP ${seller.cep || "—"}, doravante denominada simplesmente VENDEDORA.`
    );
    writeParagraph(
      `COMPRADOR(A): ${buyer.name || "—"}, portador(a) do RG nº ${buyer.rg || "—"} e inscrito(a) no CPF sob o nº ${buyer.cpf || "—"}, residente e domiciliado(a) na ${buyer.address || "—"}, ${buyer.city || "—"}, telefone ${buyer.phone || "—"}, doravante denominado(a) simplesmente COMPRADOR(A).`
    );
    writeParagraph(
      "As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Compra e Venda, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente."
    );

    // ===== Preâmbulo =====
    writeSubtitle("2. PREÂMBULO");
    writeParagraph(
      `A ${seller.company_name || "—"} é empresa que atua no comércio e instalação de piscinas e acessórios. O COMPRADOR, agindo de boa-fé, declara estar ciente das características do produto adquirido, do direito de cancelamento previsto no Código de Defesa do Consumidor e da legislação aplicável a esta relação contratual.`
    );

    // ===== Cláusulas (placeholder rendering happens further below) =====

    const installments = Array.isArray(product.payment_installments) ? product.payment_installments : [];
    if (installments.length) {
      y += 2;
      writeParagraph("Parágrafo segundo. Discriminação dos cheques/parcelas:", { indent: false });
      y += 1;
      doc.setFont(FONT, "bold"); doc.setFontSize(10);
      ensureSpace(8);
      const colN = M_LEFT;
      const colV = M_LEFT + 70;
      const colD = M_LEFT + 115;
      doc.text("Nº Cheque/Parcela", colN, y);
      doc.text("Valor", colV, y);
      doc.text("Vencimento", colD, y);
      y += 4;
      doc.setDrawColor(150);
      doc.line(M_LEFT, y, PAGE_W - M_RIGHT, y);
      y += 3;
      doc.setFont(FONT, "normal");
      for (const it of installments) {
        ensureSpace(6);
        doc.text(String(it.cheque_number || "—"), colN, y);
        doc.text(fmtCurrency(Number(it.value) || 0), colV, y);
        doc.text(it.due_date ? fmtDateBR(it.due_date) : "—", colD, y);
        y += 5;
      }
      y += 2;
    }

    // Default clauses (must mirror src/lib/contractClauseDefaults.ts)
    const DEFAULT_CLAUSES: Array<{ title: string; text: string }> = [
      { title: "DO OBJETO", text: "A VENDEDORA vende ao COMPRADOR uma Piscina modelo {{modelo}}, marca {{marca}}, tamanho {{tamanho}}, na cor {{cor}}.\n\nParágrafo único. Estão inclusos no objeto deste contrato os serviços de entrega e instalação da piscina, conforme padrão técnico do fabricante, ressalvadas as exclusões previstas neste instrumento." },
      { title: "DO VALOR E CONDIÇÕES DE PAGAMENTO", text: "O valor total ajustado entre as partes é de {{valor_total}}.\n\nParágrafo primeiro. As condições de pagamento são: {{condicoes_pagamento}}." },
      { title: "DA ENTREGA E INSTALAÇÃO", text: "A VENDEDORA se compromete a entregar e instalar o produto objeto deste contrato no prazo combinado entre as partes, salvo caso fortuito ou força maior, nos termos do art. 393 do Código Civil." },
      { title: "DAS OBRIGAÇÕES DO COMPRADOR", text: "O COMPRADOR deverá providenciar local adequado para instalação, com nivelamento, ponto de água e energia, conforme orientações fornecidas pela VENDEDORA." },
      { title: "DAS EXCLUSÕES", text: "Não estão inclusos neste contrato serviços civis, alvenaria, terraplenagem, escavação, deck, iluminação, aquecimento ou tratamento químico, salvo se expressamente descritos nas condições de pagamento." },
      { title: "DA GARANTIA", text: "O produto possui garantia conforme termos do fabricante. A garantia não cobre danos por uso indevido, falta de manutenção ou alterações realizadas por terceiros sem autorização da VENDEDORA." },
      { title: "DO CANCELAMENTO E RESCISÃO", text: "O cancelamento por parte do COMPRADOR, antes da entrega, implicará retenção dos valores já pagos a título de despesas administrativas e serviços já executados pela VENDEDORA, na forma da lei." },
      { title: "DA INADIMPLÊNCIA", text: "O atraso no pagamento de qualquer parcela acarretará multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária, sem prejuízo da execução dos títulos representativos da dívida." },
      { title: "DA TRANSFERÊNCIA DE PROPRIEDADE", text: "A transferência da propriedade do bem somente ocorrerá após o pagamento integral do preço ajustado, ficando a VENDEDORA com a posse jurídica do bem até a quitação total." },
      { title: "DAS DISPOSIÇÕES GERAIS", text: "Este contrato obriga as partes, seus herdeiros e sucessores. Qualquer alteração somente terá validade se firmada por escrito por ambas as partes." },
      { title: "DO FORO", text: "Fica eleito o foro da comarca de {{cidade_foro}} para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja." },
    ];

    // Load store override (if exists)
    const { data: storeClausesRow } = await admin
      .from("store_contract_clauses").select("clauses")
      .eq("store_id", contract.store_id).maybeSingle();

    const customClauses = Array.isArray(storeClausesRow?.clauses) && storeClausesRow!.clauses.length > 0
      ? (storeClausesRow!.clauses as Array<{ title: string; text: string }>)
      : DEFAULT_CLAUSES;

    // Replace placeholders
    const placeholders: Record<string, string> = {
      "{{vendedora}}": seller.company_name || "—",
      "{{comprador}}": buyer.name || "—",
      "{{cidade_foro}}": product.city_forum || "—",
      "{{modelo}}": product.pool_model || "—",
      "{{marca}}": product.brand || "—",
      "{{tamanho}}": product.size || "—",
      "{{cor}}": product.color || "—",
      "{{valor_total}}": fmtCurrency(product.total_value || 0),
      "{{condicoes_pagamento}}": product.payment_conditions || "—",
    };
    const interpolate = (s: string) =>
      Object.entries(placeholders).reduce((acc, [k, v]) => acc.split(k).join(v), s);

    // First two clauses already use the headers above (Object + Value).
    // To preserve current PDF structure: render ALL clauses from the list,
    // skipping titles that match what we already rendered hardcoded above.
    // Actually — simpler: replace the hardcoded "DO OBJETO" + "DO VALOR" sections
    // by using the clauses list entirely. We already wrote headers above, so render from index 2.
    let clauseNum = 3;
    for (let i = 2; i < customClauses.length; i++) {
      const c = customClauses[i];
      writeTitle(c.title, { size: SIZE_BODY, align: "left", gapBefore: 4, gapAfter: 2 });
      const paragraphs = interpolate(c.text).split(/\n\n+/);
      paragraphs.forEach((p, idx) => {
        const prefix = idx === 0 ? `CLÁUSULA ${clauseNum}ª. ` : "";
        writeParagraph(prefix + p.trim());
      });
      clauseNum++;
    }

    // ===== Local e data =====
    y += 6;
    writeParagraph(`${product.city_forum || "—"}, ${fmtDateBR(product.contract_date)}.`, { align: "right", indent: false, gapAfter: 10 });

    // ===== Assinaturas =====
    const sigBlock = (label1: string, label2: string) => {
      ensureSpace(28);
      y += 8;
      doc.setDrawColor(0);
      doc.line(M_LEFT, y, M_LEFT + 70, y);
      doc.line(PAGE_W - M_RIGHT - 70, y, PAGE_W - M_RIGHT, y);
      y += 5;
      doc.setFont(FONT, "normal"); doc.setFontSize(10);
      const wrap1 = doc.splitTextToSize(label1, 70) as string[];
      const wrap2 = doc.splitTextToSize(label2, 70) as string[];
      const maxLines = Math.max(wrap1.length, wrap2.length);
      for (let i = 0; i < maxLines; i++) {
        if (wrap1[i]) doc.text(wrap1[i], M_LEFT, y + i * 4);
        if (wrap2[i]) doc.text(wrap2[i], PAGE_W - M_RIGHT - 70, y + i * 4);
      }
      y += maxLines * 4 + 6;
    };

    sigBlock(
      `VENDEDORA\n${seller.company_name || "—"}\nCNPJ: ${seller.cnpj || "—"}`,
      `COMPRADOR(A)\n${buyer.name || "—"}\nCPF: ${buyer.cpf || "—"}`
    );
    sigBlock("Testemunha 1\nNome: ____________________________\nCPF: ____________________________",
             "Testemunha 2\nNome: ____________________________\nCPF: ____________________________");

    // ===== Rodapé com dados da empresa (todas as páginas) =====
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      const footer = `${seller.address || "—"} – ${seller.city || "—"}/${seller.state || "—"} – CEP ${seller.cep || "—"} | Fone: ${seller.phone || "—"}${seller.email ? " | " + seller.email : ""}`;
      doc.text(footer, PAGE_W / 2, PAGE_H - 10, { align: "center", maxWidth: PAGE_W - 30 });
      doc.setTextColor(0);
    }


    const pdfBytes = doc.output("arraybuffer");
    const path = `${contract.store_id}/${contract.id}.pdf`;

    const { error: upErr } = await admin.storage.from("contracts").upload(path, new Uint8Array(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: signed } = await admin.storage.from("contracts").createSignedUrl(path, 60 * 60 * 48);

    await admin.from("contracts").update({
      pdf_path: path,
      status: "enviado",
      sent_at: new Date().toISOString(),
    }).eq("id", contract.id);

    return new Response(JSON.stringify({ ok: true, path, url: signed?.signedUrl }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-contract-pdf error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

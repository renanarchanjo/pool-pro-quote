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

    // Build PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PAGE_W = 210;
    const M = 18;
    const W = PAGE_W - M * 2;
    let y = M;

    const ensureSpace = (h: number) => {
      if (y + h > 285) { doc.addPage(); y = M; }
    };
    const writeText = (text: string, opts: { size?: number; bold?: boolean; align?: "left" | "center" | "right"; gap?: number } = {}) => {
      const size = opts.size ?? 10;
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, W) as string[];
      const lineH = size * 0.45;
      ensureSpace(lines.length * lineH + (opts.gap ?? 1));
      const x = opts.align === "center" ? PAGE_W / 2 : opts.align === "right" ? PAGE_W - M : M;
      doc.text(lines, x, y, { align: opts.align ?? "left" });
      y += lines.length * lineH + (opts.gap ?? 1);
    };
    const writeKV = (label: string, value: string) => {
      writeText(`${label}: ${value || "—"}`, { size: 10 });
    };
    const hr = () => {
      ensureSpace(4);
      doc.setDrawColor(180); doc.line(M, y, PAGE_W - M, y); y += 3;
    };

    // Header
    writeText(seller.company_name || "—", { size: 16, bold: true, align: "center", gap: 2 });
    writeText("CONTRATO DE COMPRA E VENDA DE PISCINA E ACESSÓRIOS", { size: 12, bold: true, align: "center", gap: 4 });
    hr();

    // Parties
    writeText("PARTES CONTRATANTES", { size: 11, bold: true, gap: 2 });
    writeText(`Vendedor(a): ${seller.company_name || "—"}, inscrita no CNPJ nº ${seller.cnpj || "—"}, com sede na ${seller.address || "—"}, ${seller.city || "—"}, ${seller.state || "—"}, CEP ${seller.cep || "—"}.`);
    writeText(`Comprador(a): ${buyer.name || "—"} — RG: ${buyer.rg || "—"} — CPF: ${buyer.cpf || "—"}`);
    writeText(`Endereço: ${buyer.address || "—"}, ${buyer.city || "—"} — Telefone: ${buyer.phone || "—"}`);
    y += 2; hr();

    // Preâmbulo
    writeText("PREÂMBULO", { size: 11, bold: true, gap: 2 });
    writeText(
      `A ${seller.company_name || "—"} é empresa que atua no comércio e instalação de piscinas e acessórios. ` +
      `O Comprador, agindo de boa fé, declara estar ciente das características do produto adquirido, ` +
      `do direito de cancelamento previsto no Código de Defesa do Consumidor e da legislação aplicável a esta relação contratual.`
    );
    y += 2;

    // Cláusula 1
    writeText("CLÁUSULA 1ª – DO OBJETO", { size: 11, bold: true, gap: 2 });
    writeText(
      `A empresa ${seller.company_name || "—"} vende ao Comprador acima identificado uma Piscina ` +
      `modelo ${product.pool_model || "—"}, marca ${product.brand || "—"}, tamanho ${product.size || "—"}, na cor ${product.color || "—"}.`
    );
    writeText(
      `Estão inclusos no objeto deste contrato os serviços de entrega e instalação da piscina, ` +
      `conforme padrão técnico do fabricante, ressalvadas as exclusões previstas neste instrumento.`
    );
    y += 2;

    // Cláusula 2
    writeText("CLÁUSULA 2ª – DO VALOR E CONDIÇÕES DE PAGAMENTO", { size: 11, bold: true, gap: 2 });
    writeText(`Valor total: ${fmtCurrency(product.total_value || 0)}`);
    writeText(`Condições de pagamento: ${product.payment_conditions || "—"}`);

    const installments = Array.isArray(product.payment_installments) ? product.payment_installments : [];
    if (installments.length) {
      y += 1;
      writeText("Cheques:", { size: 10, bold: true, gap: 1 });
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      ensureSpace(6);
      doc.text("Nº Cheque", M, y); doc.text("Valor", M + 70, y); doc.text("Vencimento", M + 110, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      for (const it of installments) {
        ensureSpace(5);
        doc.text(String(it.cheque_number || "—"), M, y);
        doc.text(fmtCurrency(Number(it.value) || 0), M + 70, y);
        doc.text(it.due_date ? fmtDateBR(it.due_date) : "—", M + 110, y);
        y += 4;
      }
      y += 1;
    }

    // Cláusulas fixas (3-11)
    const cn = seller.company_name || "—";
    const fixedClauses: Array<[string, string]> = [
      ["CLÁUSULA 3ª – DA ENTREGA E INSTALAÇÃO",
        `A ${cn} se compromete a entregar e instalar o produto objeto deste contrato no prazo combinado entre as partes, salvo caso fortuito ou força maior.`],
      ["CLÁUSULA 4ª – DAS OBRIGAÇÕES DO COMPRADOR",
        `O Comprador deverá providenciar local adequado para instalação, com nivelamento, ponto de água e energia, conforme orientações fornecidas pela ${cn}.`],
      ["CLÁUSULA 5ª – DAS EXCLUSÕES",
        `Não estão inclusos neste contrato serviços civis, alvenaria, terraplenagem, escavação, deck, iluminação, aquecimento ou tratamento químico, salvo se expressamente descritos nas condições de pagamento.`],
      ["CLÁUSULA 6ª – DA GARANTIA",
        `O produto possui garantia conforme termos do fabricante. A garantia não cobre danos por uso indevido, falta de manutenção ou alterações realizadas por terceiros sem autorização da ${cn}.`],
      ["CLÁUSULA 7ª – DO CANCELAMENTO E RESCISÃO",
        `O cancelamento por parte do Comprador, antes da entrega, implicará retenção dos valores já pagos a título de despesas administrativas e serviços já executados pela ${cn}, na forma da lei.`],
      ["CLÁUSULA 8ª – DA INADIMPLÊNCIA",
        `O atraso no pagamento de qualquer parcela acarretará multa de 2%, juros de mora de 1% ao mês e correção monetária, sem prejuízo da execução dos títulos representativos da dívida.`],
      ["CLÁUSULA 9ª – DA TRANSFERÊNCIA DE PROPRIEDADE",
        `A transferência da propriedade do bem somente ocorrerá após o pagamento integral do preço ajustado, ficando a ${cn} com a posse jurídica do bem até a quitação total.`],
      ["CLÁUSULA 10ª – DAS DISPOSIÇÕES GERAIS",
        `Este contrato obriga as partes, seus herdeiros e sucessores. Qualquer alteração somente terá validade se firmada por escrito por ambas as partes.`],
      ["CLÁUSULA 11ª – DO FORO",
        `Fica eleito o foro da comarca de ${product.city_forum || "—"} para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`],
    ];
    for (const [title, text] of fixedClauses) {
      writeText(title, { size: 11, bold: true, gap: 1 });
      writeText(text, { gap: 2 });
    }

    // Footer
    y += 2; hr();
    writeText(
      `${seller.address || "—"} – ${seller.city || "—"} – ${seller.state || "—"}, CEP ${seller.cep || "—"}. ` +
      `Fone: ${seller.phone || "—"} | ${seller.website || "—"} – Email: ${seller.email || "—"}`,
      { size: 9, align: "center", gap: 2 }
    );

    writeText(`${product.city_forum || "—"}, ${fmtDateBR(product.contract_date)}.`, { size: 10, gap: 6 });

    // Signatures
    const sigBlock = (label1: string, label2: string) => {
      ensureSpace(22);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.line(M, y, M + 80, y);
      doc.line(PAGE_W - M - 80, y, PAGE_W - M, y);
      y += 4;
      doc.text(label1, M, y);
      doc.text(label2, PAGE_W - M - 80, y);
      y += 8;
    };

    sigBlock(`Vendedor: ${seller.company_name || "—"} — CNPJ ${seller.cnpj || "—"}`,
             `Comprador: ${buyer.name || "—"} — CPF ${buyer.cpf || "—"}`);
    sigBlock("Testemunha 1 — Nome / CPF", "Testemunha 2 — Nome / CPF");

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

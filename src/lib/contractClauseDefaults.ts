// Cláusulas padrão de contrato (mantidas em sync com supabase/functions/generate-contract-pdf)
// Placeholders disponíveis: {{vendedora}}, {{comprador}}, {{cidade_foro}},
// {{modelo}}, {{marca}}, {{tamanho}}, {{cor}}, {{valor_total}}, {{condicoes_pagamento}}

export interface ContractClause {
  title: string;
  text: string;
}

export const DEFAULT_CONTRACT_CLAUSES: ContractClause[] = [
  {
    title: "DO OBJETO",
    text: "A VENDEDORA vende ao COMPRADOR uma Piscina modelo {{modelo}}, marca {{marca}}, tamanho {{tamanho}}, na cor {{cor}}.\n\nParágrafo único. Estão inclusos no objeto deste contrato os serviços de entrega e instalação da piscina, conforme padrão técnico do fabricante, ressalvadas as exclusões previstas neste instrumento.",
  },
  {
    title: "DO VALOR E CONDIÇÕES DE PAGAMENTO",
    text: "O valor total ajustado entre as partes é de {{valor_total}}.\n\nParágrafo primeiro. As condições de pagamento são: {{condicoes_pagamento}}.",
  },
  {
    title: "DA ENTREGA E INSTALAÇÃO",
    text: "A VENDEDORA se compromete a entregar e instalar o produto objeto deste contrato no prazo combinado entre as partes, salvo caso fortuito ou força maior, nos termos do art. 393 do Código Civil.",
  },
  {
    title: "DAS OBRIGAÇÕES DO COMPRADOR",
    text: "O COMPRADOR deverá providenciar local adequado para instalação, com nivelamento, ponto de água e energia, conforme orientações fornecidas pela VENDEDORA.",
  },
  {
    title: "DAS EXCLUSÕES",
    text: "Não estão inclusos neste contrato serviços civis, alvenaria, terraplenagem, escavação, deck, iluminação, aquecimento ou tratamento químico, salvo se expressamente descritos nas condições de pagamento.",
  },
  {
    title: "DA GARANTIA",
    text: "O produto possui garantia conforme termos do fabricante. A garantia não cobre danos por uso indevido, falta de manutenção ou alterações realizadas por terceiros sem autorização da VENDEDORA.",
  },
  {
    title: "DO CANCELAMENTO E RESCISÃO",
    text: "O cancelamento por parte do COMPRADOR, antes da entrega, implicará retenção dos valores já pagos a título de despesas administrativas e serviços já executados pela VENDEDORA, na forma da lei.",
  },
  {
    title: "DA INADIMPLÊNCIA",
    text: "O atraso no pagamento de qualquer parcela acarretará multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária, sem prejuízo da execução dos títulos representativos da dívida.",
  },
  {
    title: "DA TRANSFERÊNCIA DE PROPRIEDADE",
    text: "A transferência da propriedade do bem somente ocorrerá após o pagamento integral do preço ajustado, ficando a VENDEDORA com a posse jurídica do bem até a quitação total.",
  },
  {
    title: "DAS DISPOSIÇÕES GERAIS",
    text: "Este contrato obriga as partes, seus herdeiros e sucessores. Qualquer alteração somente terá validade se firmada por escrito por ambas as partes.",
  },
  {
    title: "DO FORO",
    text: "Fica eleito o foro da comarca de {{cidade_foro}} para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
  },
];

export const CLAUSE_PLACEHOLDERS = [
  { key: "{{vendedora}}", label: "Nome da empresa vendedora" },
  { key: "{{comprador}}", label: "Nome do comprador" },
  { key: "{{cidade_foro}}", label: "Cidade do foro" },
  { key: "{{modelo}}", label: "Modelo da piscina" },
  { key: "{{marca}}", label: "Marca" },
  { key: "{{tamanho}}", label: "Tamanho" },
  { key: "{{cor}}", label: "Cor" },
  { key: "{{valor_total}}", label: "Valor total" },
  { key: "{{condicoes_pagamento}}", label: "Condições de pagamento" },
];

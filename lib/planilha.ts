// Despesas do mês agrupadas como na planilha da família: quem pagou
// (mãe ou pai) e em qual recibo entra (Decisão ou Extras), mais as
// pendentes, que ainda não entram em nenhum cálculo.

import type { Categoria, Parte } from "./calculo";
import { efeitoNoDevido, somarEfeitos } from "./calculo";
import { contaNoCalculo, paraDespesa, type LinhaDespesa } from "./dados-tipos";

export type ChaveBloco = "decisao_recebedora" | "combinada_recebedora" | "decisao_pagador" | "combinada_pagador" | "pendentes";

export interface ItemBloco {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  /** Efeito no valor a transferir: positivo quando a mãe pagou, negativo quando o pai pagou. */
  parte: number;
}

export interface Bloco {
  chave: ChaveBloco;
  categoria: Categoria | null;
  pagaPor: Parte | null;
  itens: ItemBloco[];
  totalValor: number;
  totalParte: number;
}

const ORDEM: { chave: ChaveBloco; categoria: Categoria; pagaPor: Parte }[] = [
  { chave: "decisao_recebedora", categoria: "decisao", pagaPor: "recebedora" },
  { chave: "combinada_recebedora", categoria: "combinada", pagaPor: "recebedora" },
  { chave: "decisao_pagador", categoria: "decisao", pagaPor: "pagador" },
  { chave: "combinada_pagador", categoria: "combinada", pagaPor: "pagador" },
];

function item(d: LinhaDespesa): ItemBloco {
  return { id: d.id, data: d.data, descricao: d.descricao, valor: d.valor_centavos, parte: efeitoNoDevido(paraDespesa(d)) };
}

function fechar(b: Omit<Bloco, "itens" | "totalValor" | "totalParte">, linhas: LinhaDespesa[]): Bloco {
  const itens = linhas.map(item).sort((x, y) => x.data.localeCompare(y.data));
  return {
    ...b,
    itens,
    totalValor: itens.reduce((s, i) => s + i.valor, 0),
    // Como a planilha: soma as metades exatas e arredonda só o total.
    totalParte: somarEfeitos(linhas.map(paraDespesa)),
  };
}

/**
 * Os quatro blocos do mês (só despesas que contam no cálculo) e o bloco de
 * pendentes, que junta as pendentes de todos os meses.
 */
export function blocosDoMes(competencia: string, despesas: LinhaDespesa[]): Bloco[] {
  const doMes = despesas.filter((d) => d.competencia === competencia && contaNoCalculo(d));
  const blocos = ORDEM.map((o) =>
    fechar(o, doMes.filter((d) => d.categoria === o.categoria && d.paga_por === o.pagaPor)),
  );
  const pendentes = despesas.filter((d) => d.pendente && !d.contestada_em);
  blocos.push(fechar({ chave: "pendentes", categoria: null, pagaPor: null }, pendentes));
  return blocos;
}

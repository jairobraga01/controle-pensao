// Formato das linhas do banco, sem dependências de servidor (usado também nos testes).

import type { Despesa, Parte } from "./calculo";

export interface LinhaDespesa {
  id: string;
  competencia: string;
  descricao: string;
  tipo: string;
  valor_centavos: number;
  data: string;
  paga_por: Parte;
  categoria: "decisao" | "combinada";
  divisao_tipo: "metade" | "integral" | "fixo";
  divisao_responsavel: Parte | null;
  divisao_valor_pagador: number | null;
  lancado_por: string;
  contestada_em: string | null;
  motivo_contestacao: string | null;
  importado: boolean;
  /** Registrada, mas fora do cálculo até ser incluída num mês. */
  pendente?: boolean;
}

export interface LinhaPagamento {
  id: string;
  competencia: string;
  valor_centavos: number;
  data: string;
  forma: string;
  importado: boolean;
  /** Recibo a que o pagamento se refere; vazio nos antigos/importados. */
  destino?: "judicial" | "extra" | null;
}

/** Despesas contestadas ou pendentes ficam fora do cálculo e dos recibos. */
export function contaNoCalculo(l: LinhaDespesa): boolean {
  return !l.contestada_em && !l.pendente;
}

export function paraDespesa(l: LinhaDespesa): Despesa {
  const divisao: Despesa["divisao"] =
    l.divisao_tipo === "integral"
      ? { tipo: "integral", responsavel: l.divisao_responsavel ?? "pagador" }
      : l.divisao_tipo === "fixo"
        ? { tipo: "fixo", valorPagador: l.divisao_valor_pagador ?? 0 }
        : { tipo: "metade" };
  return {
    id: l.id,
    descricao: l.descricao,
    valor: l.valor_centavos,
    data: l.data,
    pagaPor: l.paga_por,
    categoria: l.categoria,
    divisao,
  };
}

/**
 * Quanto já foi pago para cada recibo do mês. Pagamentos sem destino
 * (antigos ou importados) cobrem primeiro o judicial e o resto vai para o extra.
 */
export function pagoPorRecibo(
  totalJudicial: number,
  pagamentos: Pick<LinhaPagamento, "valor_centavos" | "destino">[],
): { judicial: number; extra: number } {
  const soma = (f: (p: (typeof pagamentos)[number]) => boolean) =>
    pagamentos.filter(f).reduce((s, p) => s + p.valor_centavos, 0);
  const judicial = soma((p) => p.destino === "judicial");
  const extra = soma((p) => p.destino === "extra");
  const semDestino = soma((p) => !p.destino);
  const noJudicial = Math.min(semDestino, Math.max(totalJudicial - judicial, 0));
  return { judicial: judicial + noJudicial, extra: extra + semDestino - noJudicial };
}

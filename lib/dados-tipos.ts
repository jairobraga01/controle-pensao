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
}

export interface LinhaPagamento {
  id: string;
  competencia: string;
  valor_centavos: number;
  data: string;
  forma: string;
  importado: boolean;
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

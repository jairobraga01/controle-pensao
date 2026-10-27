import { describe, expect, it } from "vitest";
import type { LinhaDespesa } from "./dados-tipos";
import { blocosDoMes } from "./planilha";

let n = 0;
function l(p: Partial<LinhaDespesa> & Pick<LinhaDespesa, "valor_centavos">): LinhaDespesa {
  return {
    id: String(++n),
    competencia: "2026-10",
    descricao: "",
    tipo: "escolar",
    data: "2026-10-05",
    paga_por: "recebedora",
    categoria: "decisao",
    divisao_tipo: "metade",
    divisao_responsavel: null,
    divisao_valor_pagador: null,
    lancado_por: "u",
    contestada_em: null,
    motivo_contestacao: null,
    importado: false,
    ...p,
  };
}

// Aba 10-2026 da planilha.
const outubro = [
  l({ descricao: "Escola A", valor_centavos: 155437 }),
  l({ descricao: "Van Escolar", tipo: "van", valor_centavos: 60000, divisao_tipo: "fixo", divisao_valor_pagador: 20000 }),
  l({ descricao: "Livro", valor_centavos: 8333, data: "2026-09-10" }),
  l({ descricao: "Academia", tipo: "natacao_academia", categoria: "combinada", valor_centavos: 12000 }),
  l({ descricao: "Aniversário (Boliche)", tipo: "outra", categoria: "combinada", valor_centavos: 281400 }),
  l({ descricao: "Escola B", paga_por: "pagador", valor_centavos: 76375 }),
  l({ descricao: "Plano de Saúde", tipo: "medica", paga_por: "pagador", valor_centavos: 45339 }),
  l({ descricao: "Roupas", tipo: "roupas", categoria: "combinada", competencia: "2026-05", valor_centavos: 27980,
      divisao_tipo: "integral", divisao_responsavel: "pagador", pendente: true }),
  l({ descricao: "Contestada", valor_centavos: 1000, contestada_em: "2026-10-06" }),
  l({ descricao: "Outro mês", competencia: "2026-09", valor_centavos: 1000 }),
];

describe("blocosDoMes", () => {
  const b = Object.fromEntries(blocosDoMes("2026-10", outubro).map((x) => [x.chave, x]));

  // Linhas arredondadas (777,19 + 200 + 41,67), total pela soma exata (1.018,85), como a planilha.
  it("reproduz os totais da planilha de outubro/2026", () => {
    expect([b.decisao_recebedora.totalValor, b.decisao_recebedora.totalParte]).toEqual([223770, 101885]);
    expect([b.combinada_recebedora.totalValor, b.combinada_recebedora.totalParte]).toEqual([293400, 146700]);
    expect([b.decisao_pagador.totalValor, b.decisao_pagador.totalParte]).toEqual([121714, -60857]);
    expect(b.combinada_pagador.itens).toHaveLength(0);
    expect(b.decisao_recebedora.totalParte + b.decisao_pagador.totalParte).toBe(41028);
  });

  it("mostra cada linha arredondada", () => {
    expect(b.decisao_recebedora.itens.map((i) => i.parte)).toEqual([4167, 77719, 20000]);
  });

  it("ordena por data e deixa contestadas e outros meses de fora", () => {
    expect(b.decisao_recebedora.itens.map((i) => i.descricao)).toEqual(["Livro", "Escola A", "Van Escolar"]);
  });

  it("lista as pendentes de qualquer mês, fora dos blocos do mês", () => {
    expect(b.pendentes.itens.map((i) => i.descricao)).toEqual(["Roupas"]);
    expect(b.combinada_recebedora.itens.some((i) => i.descricao === "Roupas")).toBe(false);
  });
});

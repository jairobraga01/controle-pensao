import { describe, expect, it } from "vitest";
import { calcularMes } from "./calculo";
import type { LinhaDespesa, LinhaPagamento } from "./dados-tipos";
import { montarRelatorio } from "./relatorio";
import { REGRAS_DECISAO, SALARIOS_MINIMOS } from "./tabelas";

const linha = (p: Partial<LinhaDespesa>): LinhaDespesa => ({
  id: Math.random().toString(36), competencia: "2026-10", descricao: "x", tipo: "escolar",
  valor_centavos: 10000, data: "2026-10-05", paga_por: "recebedora", categoria: "decisao",
  divisao_tipo: "metade", divisao_responsavel: null, divisao_valor_pagador: null,
  lancado_por: "u", contestada_em: null, motivo_contestacao: null, importado: false, ...p,
});

describe("relatório", () => {
  const despesas = [
    linha({ descricao: "Colégio", valor_centavos: 155437 }),
    linha({ descricao: "Van", tipo: "van", categoria: "combinada", divisao_tipo: "fixo", divisao_valor_pagador: 20000, valor_centavos: 60000 }),
    linha({ descricao: "Contestada", contestada_em: "2026-10-06" }),
    linha({ descricao: "Setembro", competencia: "2026-09", importado: true }),
  ];
  const pagamentos: LinhaPagamento[] = [
    { id: "p", competencia: "2026-10", valor_centavos: 100000, data: "2026-10-08", forma: "pix", importado: false },
  ];
  const mes = (c: string) =>
    calcularMes({
      competencia: c, regras: REGRAS_DECISAO, salarios: SALARIOS_MINIMOS,
      despesas: [], pagamentos: [],
    });

  it("lista meses em ordem, recibos e só despesas judiciais válidas", () => {
    const r = montarRelatorio(
      [mes("2026-10"), mes("2026-09")],
      [{ competencia: "2026-10", tipo: "judicial", valor_centavos: 1, confirmado_em: "2026-10-09", codigo: "AB12-CD34" }],
      despesas,
      pagamentos,
    );
    expect(r.linhas.map((l) => l.competencia)).toEqual(["2026-09", "2026-10"]);
    expect(r.linhas[1].recibos).toBe("judicial confirmado (AB12-CD34)");
    expect(r.linhas[0].recibos).toBe("sem recibo");
    expect(r.despesasJudiciais.map((d) => d.descricao)).toEqual(["Setembro", "Colégio"]);
    expect(r.despesasJudiciais[0].comprovante).toBe("importado da planilha");
    expect(r.despesasJudiciais[1].efeito).toBe(77719);
    expect(r.pagamentos).toHaveLength(1);
    expect(r.totais.pensao).toBe(2 * 194520);
  });
});

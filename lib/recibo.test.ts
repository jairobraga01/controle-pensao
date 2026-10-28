import { describe, expect, it } from "vitest";
import { calcularMes, type Despesa } from "./calculo";
import { dataDoRecibo, itensDoRecibo, textoDoRecibo, valorDoRecibo } from "./recibo";
import { REGRAS_DECISAO, SALARIOS_MINIMOS } from "./tabelas";
import { TIPOS_PADRAO, acharTipo, regraDoTipo } from "./tipos";

function d(tipo: string, descricao: string, valor: number, pagaPor: Despesa["pagaPor"] = "recebedora"): Despesa {
  return { id: descricao, descricao, valor, data: "2026-10-05", pagaPor, ...regraDoTipo(acharTipo(TIPOS_PADRAO, tipo)!) };
}

const despesas = [
  d("escolar", "Colégio", 155437),
  d("escolar", "Livro", 8333),
  d("medica", "Plano de saúde", 45339, "pagador"),
  d("natacao_academia", "Natação", 19600),
  d("van", "Van", 60000),
];
const resumo = calcularMes({
  competencia: "2026-10",
  regras: REGRAS_DECISAO,
  salarios: SALARIOS_MINIMOS,
  despesas,
  pagamentos: [],
});

describe("recibos do mês", () => {
  it("judicial: pensão + médicas, escolares e van", () => {
    const itens = itensDoRecibo("judicial", resumo, despesas);
    expect(itens.map((i) => i.valor_centavos)).toEqual([194520, 77719, 4167, -22670, 20000]);
    expect(itens.reduce((s, i) => s + i.valor_centavos, 0)).toBe(valorDoRecibo("judicial", resumo));
    expect(valorDoRecibo("judicial", resumo)).toBe(273736);
  });

  it("extra: natação", () => {
    const itens = itensDoRecibo("extra", resumo, despesas);
    expect(itens.map((i) => i.descricao)).toEqual(["Parte do pai: Natação"]);
    expect(valorDoRecibo("extra", resumo)).toBe(9800);
  });

  it("texto do extra não fala em pensão quitada", () => {
    const base = {
      recebedora: { nome: "Mãe", qualificacao: null, cpf: null, rg: null, endereco: null },
      pagador: { nome: "Pai", cpf: null, rg: null },
      alimentando: "Filha",
      competencia: "2026-10",
      valor: 29800,
      processo: { numero: "123", vara: "Vara" },
    };
    expect(textoDoRecibo({ ...base, tipo: "extra" }).join(" ")).toContain("despesas extras");
    expect(textoDoRecibo({ ...base, tipo: "judicial" }).join(" ")).toContain("Pensão Alimentícia");
  });
});

describe("dataDoRecibo", () => {
  const extenso = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d);
  it("usa a data informada no pagamento, sem voltar um dia no fuso", () => {
    expect(extenso(dataDoRecibo({ data_pagamento: "2026-01-10", confirmado_em: "2026-02-01T15:00:00Z" }))).toBe("10 de janeiro de 2026");
  });
  it("sem data do pagamento, cai no aceite", () => {
    expect(extenso(dataDoRecibo({ confirmado_em: "2026-02-01T15:00:00Z" }))).toBe("1 de fevereiro de 2026");
  });
});

import { describe, expect, it } from "vitest";
import { efeitoNoDevido } from "./calculo";
import { TIPOS_PADRAO, acharTipo, codigoNovo, descreverDivisao, paraTipo, regraDoTipo } from "./tipos";

const tipo = (codigo: string) => acharTipo(TIPOS_PADRAO, codigo)!;

function efeito(codigo: string, valor: number, pagaPor: "pagador" | "recebedora" = "recebedora") {
  const r = regraDoTipo(tipo(codigo), { tipo: "metade" });
  return efeitoNoDevido({ id: "x", descricao: "", data: "2026-10-01", valor, pagaPor, ...r });
}

describe("tipos de despesa", () => {
  it("médicas, escolares e van vão no recibo judicial", () => {
    expect(regraDoTipo(tipo("medica")).categoria).toBe("decisao");
    expect(regraDoTipo(tipo("escolar")).categoria).toBe("decisao");
    expect(regraDoTipo(tipo("van")).categoria).toBe("decisao");
    expect(efeito("van", 60000)).toBe(20000);
    expect(efeito("escolar", 155437)).toBe(77719);
    expect(efeito("medica", 45339, "pagador")).toBe(-22670);
  });

  it("natação e roupas vão no recibo extra", () => {
    expect(regraDoTipo(tipo("natacao_academia")).categoria).toBe("combinada");
    expect(regraDoTipo(tipo("roupas")).categoria).toBe("combinada");
    expect(efeito("natacao_academia", 19600)).toBe(9800);
    expect(efeito("roupas", 144880)).toBe(144880);
  });

  it("tipo sem divisão própria usa a escolhida e exige uma", () => {
    expect(regraDoTipo(tipo("outra"), { tipo: "integral", responsavel: "recebedora" }).divisao).toEqual({
      tipo: "integral",
      responsavel: "recebedora",
    });
    expect(() => regraDoTipo(tipo("outra"))).toThrow();
  });

  it("lê a linha do banco", () => {
    const t = paraTipo({
      codigo: "ingles", rotulo: "Inglês", detalhe: "", categoria: "combinada",
      divisao_tipo: "fixo", divisao_responsavel: null, divisao_valor_pagador: 12300, ativo: true,
    });
    expect(t.divisao).toEqual({ tipo: "fixo", valorPagador: 12300 });
    expect(descreverDivisao(t.divisao)).toBe("R$ 123,00 para o pai");
  });

  it("gera código novo sem repetir", () => {
    expect(codigoNovo("Inglês CNA", [])).toBe("ingles_cna");
    expect(codigoNovo("Van escolar", ["van_escolar"])).toBe("van_escolar_2");
  });
});

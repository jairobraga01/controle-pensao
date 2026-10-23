import { describe, expect, it } from "vitest";
import { efeitoNoDevido } from "./calculo";
import { ehTipo, regraDoTipo } from "./tipos";

function efeito(tipo: Parameters<typeof regraDoTipo>[0], valor: number, pagaPor: "pagador" | "recebedora" = "recebedora") {
  const r = regraDoTipo(tipo, { tipo: "metade" });
  return efeitoNoDevido({ id: "x", descricao: "", data: "2026-10-01", valor, pagaPor, ...r });
}

describe("tipos de despesa", () => {
  it("médicas e escolares vão no recibo judicial, 50/50", () => {
    expect(regraDoTipo("medica").categoria).toBe("decisao");
    expect(regraDoTipo("escolar").categoria).toBe("decisao");
    expect(efeito("escolar", 155437)).toBe(77719);
    expect(efeito("medica", 45339, "pagador")).toBe(-22670);
  });

  it("natação, van e roupas vão no recibo extra", () => {
    expect(regraDoTipo("natacao_academia").categoria).toBe("combinada");
    expect(efeito("natacao_academia", 19600)).toBe(9800);
    expect(efeito("van", 60000)).toBe(20000);
    expect(efeito("roupas", 144880)).toBe(144880);
  });

  it("outra usa a divisão escolhida e exige uma", () => {
    expect(regraDoTipo("outra", { tipo: "integral", responsavel: "recebedora" }).divisao).toEqual({
      tipo: "integral",
      responsavel: "recebedora",
    });
    expect(() => regraDoTipo("outra")).toThrow();
  });

  it("valida o tipo recebido", () => {
    expect(ehTipo("van")).toBe(true);
    expect(ehTipo("toString")).toBe(false);
  });
});

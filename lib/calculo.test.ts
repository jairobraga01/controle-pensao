import { describe, expect, it } from "vitest";
import {
  calcularMes,
  competencias,
  formatarReais,
  lerReais,
  statusDoMes,
  type Despesa,
} from "./calculo";
import { valorPorExtenso } from "./extenso";
import { REGRAS_DECISAO, SALARIOS_MINIMOS } from "./tabelas";

const base = { regras: REGRAS_DECISAO, salarios: SALARIOS_MINIMOS, pagamentos: [] };

function d(p: Partial<Despesa> & Pick<Despesa, "valor">): Despesa {
  return {
    id: Math.random().toString(36),
    descricao: "",
    data: "2026-10-05",
    pagaPor: "recebedora",
    categoria: "decisao",
    divisao: { tipo: "metade" },
    ...p,
  };
}

// Aba 10-2026 da planilha, com as regras decididas em 23/10/2026.
const outubro: Despesa[] = [
  d({ descricao: "Colégio", valor: 155437 }),
  d({ descricao: "Livro", valor: 8333 }),
  d({ descricao: "Plano de saúde", valor: 45339, pagaPor: "pagador" }),
  d({ descricao: "Natação", valor: 19600, categoria: "combinada" }),
  d({
    descricao: "Van",
    valor: 60000,
    categoria: "combinada",
    divisao: { tipo: "fixo", valorPagador: 20000 },
  }),
];

describe("calcularMes", () => {
  it("reproduz outubro/2026 da planilha", () => {
    const r = calcularMes({ ...base, competencia: "2026-10", despesas: outubro });
    expect(r.pensao).toBe(194520);
    expect(r.despesasDecisao).toBe(59216);
    expect(r.totalRecibo).toBe(253736);
    expect(r.totalDemonstrativo).toBe(29800);
    expect(r.total).toBe(283536);
  });

  it("usa o salário mínimo vigente na competência", () => {
    expect(calcularMes({ ...base, competencia: "2025-12", despesas: [] }).pensao).toBe(182160);
    expect(calcularMes({ ...base, competencia: "2024-09", despesas: [] }).pensao).toBe(169440);
  });

  it("roupas 100% do pagador entram integrais", () => {
    const r = calcularMes({
      ...base,
      competencia: "2026-06",
      despesas: [
        d({
          valor: 144880,
          categoria: "combinada",
          divisao: { tipo: "integral", responsavel: "pagador" },
        }),
      ],
    });
    expect(r.totalDemonstrativo).toBe(144880);
  });

  it("abate pagamentos e define status", () => {
    const r = calcularMes({
      ...base,
      competencia: "2026-10",
      despesas: outubro,
      pagamentos: [{ id: "p", valor: 200000, data: "2026-10-08" }],
    });
    expect(r.saldo).toBe(83536);
    expect(statusDoMes(r, "2026-10-09")).toBe("aberto");
    expect(statusDoMes(r, "2026-10-11")).toBe("atrasado");
    expect(statusDoMes({ ...r, saldo: 0 }, "2026-12-01")).toBe("quitado");
  });

  it("recusa competência anterior à decisão", () => {
    expect(() => calcularMes({ ...base, competencia: "2024-08", despesas: [] })).toThrow();
  });
});

describe("utilitários", () => {
  it("lista competências", () => {
    expect(competencias("2024-11", "2025-02")).toEqual([
      "2024-11", "2024-12", "2025-01", "2025-02",
    ]);
  });

  it("formata reais", () => {
    expect(formatarReais(253736)).toBe("R$ 2.537,36");
    expect(formatarReais(-22670)).toBe("-R$ 226,70");
  });

  it("lê valores digitados", () => {
    expect(lerReais("830,50")).toBe(83050);
    expect(lerReais("R$ 1.554,37")).toBe(155437);
    expect(lerReais("1554.37")).toBe(155437);
    expect(lerReais("200")).toBe(20000);
    expect(lerReais("abc")).toBeNull();
    expect(lerReais("0")).toBeNull();
  });

  it("escreve valores por extenso", () => {
    expect(valorPorExtenso(253736)).toBe(
      "dois mil, quinhentos e trinta e sete reais e trinta e seis centavos",
    );
    expect(valorPorExtenso(246438)).toBe(
      "dois mil, quatrocentos e sessenta e quatro reais e trinta e oito centavos",
    );
    expect(valorPorExtenso(200000)).toBe("dois mil reais");
    expect(valorPorExtenso(210000)).toBe("dois mil e cem reais");
    expect(valorPorExtenso(100)).toBe("um real");
    expect(valorPorExtenso(5)).toBe("cinco centavos");
  });
});

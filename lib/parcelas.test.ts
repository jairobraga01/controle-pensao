import { describe, expect, test } from "vitest";
import { dividirCentavos, gerarParcelas, somarMeses } from "./parcelas";

describe("parcelas", () => {
  test("soma meses virando o ano", () => {
    expect(somarMeses("2026-11", 0)).toBe("2026-11");
    expect(somarMeses("2026-11", 2)).toBe("2027-01");
    expect(somarMeses("2026-12", 13)).toBe("2028-01");
  });
  test("divide sem perder centavo", () => {
    expect(dividirCentavos(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(dividirCentavos(90000, 3)).toEqual([30000, 30000, 30000]);
  });
  test("gera uma despesa por mês com 1/N na descrição", () => {
    const p = gerarParcelas({ descricao: "Óculos", competencia: "2026-11", valor_centavos: 100000, divisao_valor_pagador: null }, 3);
    expect(p.map((x) => x.descricao)).toEqual(["Óculos (1/3)", "Óculos (2/3)", "Óculos (3/3)"]);
    expect(p.map((x) => x.competencia)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(p.reduce((s, x) => s + x.valor_centavos, 0)).toBe(100000);
  });
  test("à vista não muda a descrição", () => {
    expect(gerarParcelas({ descricao: "Remédio", competencia: "2026-11", valor_centavos: 5000, divisao_valor_pagador: null }, 1)[0].descricao).toBe("Remédio");
  });
  test("valor fixo do pai também é dividido", () => {
    const p = gerarParcelas({ descricao: "X", competencia: "2026-11", valor_centavos: 60000, divisao_valor_pagador: 20000 }, 2);
    expect(p.map((x) => x.divisao_valor_pagador)).toEqual([10000, 10000]);
  });
});

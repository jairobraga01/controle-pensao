import { describe, expect, it } from "vitest";
import { MODELO_CSV, lerCsv } from "./importacao";

describe("importação CSV", () => {
  it("lê o modelo sem erros", () => {
    const r = lerCsv(MODELO_CSV);
    expect(r.erros).toEqual([]);
    expect(r.despesas).toHaveLength(5);
    expect(r.pagamentos).toEqual([
      { linha: 7, competencia: "2026-10", data: "2026-10-08", valor: 283536, forma: "pix" },
    ]);
    const van = r.despesas.find((d) => d.tipo === "van")!;
    expect(van.divisao).toEqual({ tipo: "fixo", valorPagador: 20000 });
    expect(r.despesas.find((d) => d.tipo === "outra")!.divisao).toEqual({ tipo: "metade" });
  });

  it("aceita data brasileira, BOM e aspas", () => {
    const csv =
      "﻿lancamento;competencia;data;descricao;tipo;valor;pago_por;divisao;valor_fixo;forma\r\n" +
      'despesa;2026-01;13/01/2026;"Livros; 2 volumes";escolar;R$ 839,00;mae;;;\r\n';
    const r = lerCsv(csv);
    expect(r.erros).toEqual([]);
    expect(r.despesas[0]).toMatchObject({ data: "2026-01-13", descricao: "Livros; 2 volumes", valor: 83900 });
  });

  it("aponta cada linha com problema", () => {
    const csv =
      "lancamento;competencia;data;descricao;tipo;valor;pago_por;divisao;valor_fixo;forma\n" +
      "despesa;2026-13;2026-01-01;X;escolar;10;mae;;;\n" +
      "despesa;2026-01;31/02/2026;X;escolar;10;mae;;;\n" +
      "despesa;2026-01;2026-01-01;X;lazer;10;mae;;;\n" +
      "despesa;2026-01;2026-01-01;X;outra;10;mae;;;\n" +
      "despesa;2026-01;2026-01-01;X;escolar;10;avó;;;\n" +
      "pagamento;2026-01;2026-01-01;;;abc;;;;pix\n";
    const r = lerCsv(csv);
    expect(r.erros.map((e) => e.split(":")[0])).toEqual([
      "Linha 2", "Linha 3", "Linha 4", "Linha 5", "Linha 6", "Linha 7",
    ]);
    expect(r.despesas).toHaveLength(0);
  });

  it("recusa cabeçalho errado", () => {
    expect(lerCsv("a;b;c\n1;2;3").erros[0]).toContain("Cabeçalho incompleto");
  });
});

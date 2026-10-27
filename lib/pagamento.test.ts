import { describe, expect, it } from "vitest";
import { pagoPorRecibo } from "./dados-tipos";

describe("pagoPorRecibo", () => {
  it("separa pelos destinos", () => {
    expect(pagoPorRecibo(235548, [
      { valor_centavos: 235548, destino: "judicial" },
      { valor_centavos: 146700, destino: "extra" },
    ])).toEqual({ judicial: 235548, extra: 146700 });
  });
  it("pagamento importado cobre o judicial e o resto vai para o extra", () => {
    expect(pagoPorRecibo(235548, [{ valor_centavos: 382248, destino: null }])).toEqual({ judicial: 235548, extra: 146700 });
    expect(pagoPorRecibo(235548, [{ valor_centavos: 100000 }])).toEqual({ judicial: 100000, extra: 0 });
  });
});

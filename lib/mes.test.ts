import { describe, expect, test } from "vitest";
import { lerMes, mesParaTela } from "./mes";

describe("lerMes", () => {
  test("aceita mês/ano e ano-mês", () => {
    expect(lerMes("10/2024")).toBe("2024-10");
    expect(lerMes(" 1/2025 ")).toBe("2025-01");
    expect(lerMes("2024-10")).toBe("2024-10");
  });
  test("recusa o que não é mês", () => {
    expect(lerMes("")).toBeNull();
    expect(lerMes("13/2024")).toBeNull();
    expect(lerMes("outubro")).toBeNull();
  });
  test("mostra como mês/ano", () => {
    expect(mesParaTela("2024-10")).toBe("10/2024");
  });
});

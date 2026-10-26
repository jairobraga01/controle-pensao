import type { Regra, SalarioMinimo } from "./calculo";

// Salário mínimo nacional por vigência (centavos).
// 2026: R$ 1.621,00, valor usado na planilha a partir de fevereiro/2026.
export const SALARIOS_MINIMOS: SalarioMinimo[] = [
  { vigenciaInicio: "2024-01", valor: 141200 },
  { vigenciaInicio: "2025-01", valor: 151800 },
  { vigenciaInicio: "2026-01", valor: 162100 },
];

// Regra padrão da decisão provisória:
// 120% do salário mínimo, pago até o dia 10 de cada mês.
export const REGRAS_DECISAO: Regra[] = [
  { vigenciaInicio: "2024-09", percentualPensao: 120, diaVencimento: 10 },
];

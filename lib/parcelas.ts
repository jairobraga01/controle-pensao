// Despesa parcelada: uma compra dividida em N meses seguidos.

export const MAX_PARCELAS = 24;

/** "2026-11" + 2 → "2027-01". */
export function somarMeses(competencia: string, n: number): string {
  const [a, m] = competencia.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Divide centavos em n partes; os centavos que sobram vão na 1ª parcela. */
export function dividirCentavos(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? total - base * (n - 1) : base));
}

export type Parcela = { numero: number; competencia: string; descricao: string; valor_centavos: number; divisao_valor_pagador: number | null };

/** Uma linha por mês, a partir do mês escolhido, com "(1/N)" na descrição. */
export function gerarParcelas(d: {
  descricao: string;
  competencia: string;
  valor_centavos: number;
  divisao_valor_pagador: number | null;
}, n: number): Parcela[] {
  const valores = dividirCentavos(d.valor_centavos, n);
  const fixos = d.divisao_valor_pagador === null ? null : dividirCentavos(d.divisao_valor_pagador, n);
  return valores.map((v, i) => ({
    numero: i + 1,
    competencia: somarMeses(d.competencia, i),
    descricao: n > 1 ? `${d.descricao} (${i + 1}/${n})` : d.descricao,
    valor_centavos: v,
    divisao_valor_pagador: fixos ? fixos[i] : null,
  }));
}

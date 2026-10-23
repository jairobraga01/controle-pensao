import type { Categoria, Divisao } from "./calculo";

// Tipos de despesa oferecidos no lançamento. Cada tipo já define em qual
// recibo a despesa entra e como ela é dividida.
export const TIPOS_DESPESA = {
  medica: {
    rotulo: "Despesas médicas",
    detalhe: "Plano de saúde, medicamentos e gastos hospitalares",
    categoria: "decisao",
    divisao: { tipo: "metade" },
  },
  escolar: {
    rotulo: "Despesas escolares",
    detalhe: "Mensalidade, material, uniforme e passeios escolares",
    categoria: "decisao",
    divisao: { tipo: "metade" },
  },
  natacao_academia: {
    rotulo: "Natação/Academia",
    detalhe: "50% cada",
    categoria: "combinada",
    divisao: { tipo: "metade" },
  },
  van: {
    rotulo: "Van escolar",
    detalhe: "R$ 200,00 para o pai",
    categoria: "combinada",
    divisao: { tipo: "fixo", valorPagador: 20000 },
  },
  roupas: {
    rotulo: "Roupas",
    detalhe: "100% pai",
    categoria: "combinada",
    divisao: { tipo: "integral", responsavel: "pagador" },
  },
  outra: {
    rotulo: "Outra despesa combinada",
    detalhe: "Você escolhe a divisão",
    categoria: "combinada",
    divisao: null,
  },
} as const satisfies Record<
  string,
  { rotulo: string; detalhe: string; categoria: Categoria; divisao: Divisao | null }
>;

export type TipoDespesa = keyof typeof TIPOS_DESPESA;

export function ehTipo(v: string): v is TipoDespesa {
  return Object.hasOwn(TIPOS_DESPESA, v);
}

export function nomeDoRecibo(c: Categoria): string {
  return c === "decisao" ? "Recibo judicial" : "Recibo extra";
}

/** Categoria e divisão de um tipo; "outra" usa a divisão escolhida no formulário. */
export function regraDoTipo(
  tipo: TipoDespesa,
  divisaoManual?: Divisao,
): { categoria: Categoria; divisao: Divisao } {
  const t = TIPOS_DESPESA[tipo];
  const divisao = t.divisao ?? divisaoManual;
  if (!divisao) throw new Error("Escolha a divisão da despesa.");
  return { categoria: t.categoria, divisao };
}

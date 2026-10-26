import type { Categoria, Divisao } from "./calculo";

// Tipos de despesa oferecidos no lançamento. Cada tipo define em qual recibo a
// despesa entra e como ela é dividida. O cadastro fica no banco (aba Dados da
// Pensão); estes são os tipos com que todo processo começa.
export interface TipoCadastro {
  codigo: string;
  rotulo: string;
  detalhe: string;
  categoria: Categoria;
  /** null: a divisão é escolhida em cada lançamento. */
  divisao: Divisao | null;
  ativo: boolean;
}

export const TIPOS_PADRAO: TipoCadastro[] = [
  {
    codigo: "medica",
    rotulo: "Despesas médicas",
    detalhe: "Plano de saúde, medicamentos e gastos hospitalares",
    categoria: "decisao",
    divisao: { tipo: "metade" },
    ativo: true,
  },
  {
    codigo: "escolar",
    rotulo: "Despesas escolares",
    detalhe: "Mensalidade, material, uniforme e passeios escolares",
    categoria: "decisao",
    divisao: { tipo: "metade" },
    ativo: true,
  },
  {
    codigo: "natacao_academia",
    rotulo: "Natação/Academia",
    detalhe: "50% cada",
    categoria: "combinada",
    divisao: { tipo: "metade" },
    ativo: true,
  },
  {
    codigo: "van",
    rotulo: "Van escolar",
    detalhe: "R$ 200,00 para o pai",
    categoria: "decisao",
    divisao: { tipo: "fixo", valorPagador: 20000 },
    ativo: true,
  },
  {
    codigo: "roupas",
    rotulo: "Roupas",
    detalhe: "100% pai",
    categoria: "combinada",
    divisao: { tipo: "integral", responsavel: "pagador" },
    ativo: true,
  },
  {
    codigo: "outra",
    rotulo: "Outra despesa combinada",
    detalhe: "Você escolhe a divisão",
    categoria: "combinada",
    divisao: null,
    ativo: true,
  },
];

/** Linha da tabela tipos_despesa. */
export interface LinhaTipo {
  codigo: string;
  rotulo: string;
  detalhe: string;
  categoria: Categoria;
  divisao_tipo: "metade" | "integral" | "fixo" | null;
  divisao_responsavel: "pagador" | "recebedora" | null;
  divisao_valor_pagador: number | null;
  ativo: boolean;
}

export function paraTipo(l: LinhaTipo): TipoCadastro {
  const divisao: Divisao | null =
    l.divisao_tipo === "integral"
      ? { tipo: "integral", responsavel: l.divisao_responsavel ?? "pagador" }
      : l.divisao_tipo === "fixo"
        ? { tipo: "fixo", valorPagador: l.divisao_valor_pagador ?? 0 }
        : l.divisao_tipo === "metade"
          ? { tipo: "metade" }
          : null;
  return { codigo: l.codigo, rotulo: l.rotulo, detalhe: l.detalhe, categoria: l.categoria, divisao, ativo: l.ativo };
}

export function acharTipo(tipos: TipoCadastro[], codigo: string): TipoCadastro | undefined {
  return tipos.find((t) => t.codigo === codigo);
}

/** Nome do tipo para mostrar; tipos antigos sem cadastro aparecem pelo código. */
export function rotuloDoTipo(tipos: TipoCadastro[], codigo: string): string {
  return acharTipo(tipos, codigo)?.rotulo ?? codigo;
}

export function nomeDoRecibo(c: Categoria): string {
  return c === "decisao" ? "Recibo judicial" : "Recibo extra";
}

/** Texto curto da divisão, para listas e dicas. */
export function descreverDivisao(d: Divisao | null): string {
  if (!d) return "divisão escolhida no lançamento";
  if (d.tipo === "metade") return "50% cada";
  if (d.tipo === "integral") return d.responsavel === "pagador" ? "100% pai" : "100% mãe";
  return `R$ ${(d.valorPagador / 100).toFixed(2).replace(".", ",")} para o pai`;
}

/** Categoria e divisão de um tipo; sem divisão própria, usa a escolhida no formulário. */
export function regraDoTipo(
  tipo: TipoCadastro,
  divisaoManual?: Divisao,
): { categoria: Categoria; divisao: Divisao } {
  const divisao = tipo.divisao ?? divisaoManual;
  if (!divisao) throw new Error("Escolha a divisão da despesa.");
  return { categoria: tipo.categoria, divisao };
}

/** Código para um tipo novo a partir do nome, sem repetir os existentes. */
export function codigoNovo(rotulo: string, existentes: string[]): string {
  const base =
    rotulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "tipo";
  let codigo = base;
  for (let i = 2; existentes.includes(codigo); i++) codigo = `${base}_${i}`;
  return codigo;
}

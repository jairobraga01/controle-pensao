import { efeitoNoDevido, formatarReais, nomeDoMes, type Despesa, type ResumoMes } from "./calculo";
import { valorPorExtenso } from "./extenso";

export type TipoRecibo = "judicial" | "extra";

export const TIPOS_RECIBO: TipoRecibo[] = ["judicial", "extra"];

export function ehTipoRecibo(v: string): v is TipoRecibo {
  return v === "judicial" || v === "extra";
}

export const TITULO_RECIBO: Record<TipoRecibo, string> = {
  judicial: "RECIBO DE PAGAMENTO DE PENSÃO ALIMENTÍCIA",
  extra: "RECIBO DE PAGAMENTO DE DESPESAS EXTRAS",
};

export interface ItemRecibo {
  descricao: string;
  valor_centavos: number;
}

/**
 * Itens de cada recibo do mês: o judicial leva a pensão e as despesas
 * médicas e escolares; o extra leva as despesas combinadas.
 */
export function itensDoRecibo(tipo: TipoRecibo, resumo: ResumoMes, despesasDoMes: Despesa[]): ItemRecibo[] {
  const itens: ItemRecibo[] = [];
  if (tipo === "judicial") {
    itens.push({
      descricao: `Pensão: ${resumo.percentualPensao}% do salário mínimo (${formatarReais(resumo.salarioMinimo)})`,
      valor_centavos: resumo.pensao,
    });
  }
  const categoria = tipo === "judicial" ? "decisao" : "combinada";
  for (const d of despesasDoMes.filter((x) => x.categoria === categoria)) {
    const efeito = efeitoNoDevido(d);
    if (efeito === 0) continue;
    itens.push({
      descricao:
        efeito > 0
          ? `Parte do pai: ${d.descricao}`
          : `(-) Parte da mãe: ${d.descricao}, pago pelo pai`,
      valor_centavos: efeito,
    });
  }
  return itens;
}

export function valorDoRecibo(tipo: TipoRecibo, resumo: ResumoMes): number {
  return tipo === "judicial" ? resumo.totalRecibo : resumo.totalDemonstrativo;
}

export interface DadosRecibo {
  tipo: TipoRecibo;
  recebedora: { nome: string; qualificacao: string | null; cpf: string | null; rg: string | null; endereco: string | null };
  pagador: { nome: string; cpf: string | null; rg: string | null };
  alimentando: string;
  competencia: string;
  valor: number;
  processo: { numero: string; vara: string };
}

function campo(rotulo: string, v: string | null) {
  return v ? `, ${rotulo} ${v}` : "";
}

/** Texto do recibo, no modelo usado pelas partes desde 2025. */
export function textoDoRecibo(r: DadosRecibo): string[] {
  const mes = nomeDoMes(r.competencia).toUpperCase();
  const declaracao =
    `Pelo presente, eu, ${r.recebedora.nome.toUpperCase()}` +
    (r.recebedora.qualificacao ? `, ${r.recebedora.qualificacao}` : "") +
    campo("portadora do RG nº", r.recebedora.rg) +
    campo("CPF nº", r.recebedora.cpf) +
    (r.recebedora.endereco ? `, residente e domiciliada em ${r.recebedora.endereco}` : "") +
    `, DECLARO, para os devidos fins, que RECEBI a quantia de ${formatarReais(r.valor)} ` +
    `(${valorPorExtenso(r.valor)}), em razão do pagamento efetuado por ${r.pagador.nome.toUpperCase()}` +
    campo("inscrito no CPF nº", r.pagador.cpf) +
    campo("RG nº", r.pagador.rg) +
    ".";

  if (r.tipo === "extra") {
    return [
      declaracao,
      `Este pagamento se refere às despesas extras da filha em comum, ${r.alimentando.toUpperCase()}, ` +
        `relativas ao mês de ${mes}, combinadas entre as partes, conforme os itens abaixo.`,
      `Declaro que estes valores não se confundem com a pensão alimentícia e as despesas ` +
        `extraordinárias fixadas nos AUTOS nº ${r.processo.numero}, da ${r.processo.vara}, ` +
        `que têm recibo próprio.`,
    ];
  }
  return [
    declaracao,
    `Este pagamento se refere ao adimplemento de Pensão Alimentícia da filha em comum, ` +
      `${r.alimentando.toUpperCase()}, relativa ao mês de ${mes}, conforme os itens abaixo.`,
    `Declaro ainda que considero quitados os valores determinados para o referido período, ` +
      `nos AUTOS nº ${r.processo.numero}, da ${r.processo.vara}.`,
  ];
}

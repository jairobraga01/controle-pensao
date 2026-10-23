import { efeitoNoDevido, formatarReais, nomeDoMes, type Despesa, type ResumoMes } from "./calculo";
import { valorPorExtenso } from "./extenso";

export interface ItemRecibo {
  descricao: string;
  valor_centavos: number;
}

/** Itens do recibo judicial: pensão + despesas previstas na decisão. */
export function itensDoRecibo(resumo: ResumoMes, despesasDoMes: Despesa[]): ItemRecibo[] {
  const itens: ItemRecibo[] = [
    {
      descricao: `Pensão: ${resumo.percentualPensao}% do salário mínimo (${formatarReais(resumo.salarioMinimo)})`,
      valor_centavos: resumo.pensao,
    },
  ];
  for (const d of despesasDoMes.filter((x) => x.categoria === "decisao")) {
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

export interface DadosRecibo {
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
  return [
    `Pelo presente, eu, ${r.recebedora.nome.toUpperCase()}` +
      (r.recebedora.qualificacao ? `, ${r.recebedora.qualificacao}` : "") +
      campo("portadora do RG nº", r.recebedora.rg) +
      campo("CPF nº", r.recebedora.cpf) +
      (r.recebedora.endereco ? `, residente e domiciliada em ${r.recebedora.endereco}` : "") +
      `, DECLARO, para os devidos fins, que RECEBI a quantia de ${formatarReais(r.valor)} ` +
      `(${valorPorExtenso(r.valor)}), em razão do pagamento efetuado por ${r.pagador.nome.toUpperCase()}` +
      campo("inscrito no CPF nº", r.pagador.cpf) +
      campo("RG nº", r.pagador.rg) +
      ".",
    `Este pagamento se refere ao adimplemento de Pensão Alimentícia da filha em comum, ` +
      `${r.alimentando.toUpperCase()}, relativa ao mês de ${mes}, conforme os itens abaixo.`,
    `Declaro ainda que considero quitados os valores determinados para o referido período, ` +
      `nos AUTOS nº ${r.processo.numero}, da ${r.processo.vara}.`,
  ];
}

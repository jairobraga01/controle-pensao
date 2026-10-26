// Regras de cálculo da pensão. Todos os valores em centavos (inteiros)
// para evitar erros de arredondamento com números de ponto flutuante.

export type Parte = "pagador" | "recebedora";

export type Categoria = "decisao" | "combinada";

export type Divisao =
  | { tipo: "metade" }
  | { tipo: "integral"; responsavel: Parte }
  | { tipo: "fixo"; valorPagador: number };

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  pagaPor: Parte;
  categoria: Categoria;
  divisao: Divisao;
}

export interface Pagamento {
  id: string;
  valor: number;
  data: string;
}

export interface Regra {
  vigenciaInicio: string; // AAAA-MM
  percentualPensao: number; // 120 = 120% do salário mínimo
  diaVencimento: number;
}

export interface SalarioMinimo {
  vigenciaInicio: string; // AAAA-MM
  valor: number;
}

export interface ResumoMes {
  competencia: string;
  salarioMinimo: number;
  percentualPensao: number;
  pensao: number;
  despesasDecisao: number;
  despesasCombinadas: number;
  totalRecibo: number;
  totalDemonstrativo: number;
  total: number;
  pago: number;
  saldo: number;
  vencimento: string;
}

/** Arredonda meio centavo para cima em módulo, como a planilha. */
function arred(v: number): number {
  return Math.sign(v) * Math.round(Math.abs(v));
}

/** Quanto da despesa cabe a cada parte. */
export function partes(d: Despesa): Record<Parte, number> {
  switch (d.divisao.tipo) {
    case "metade": {
      const pagador = arred(d.valor / 2);
      return { pagador, recebedora: d.valor - pagador };
    }
    case "integral":
      return d.divisao.responsavel === "pagador"
        ? { pagador: d.valor, recebedora: 0 }
        : { pagador: 0, recebedora: d.valor };
    case "fixo": {
      const pagador = Math.min(d.divisao.valorPagador, d.valor);
      return { pagador, recebedora: d.valor - pagador };
    }
  }
}

/**
 * Efeito da despesa no valor que o pagador transfere no mês:
 * positivo quando a recebedora pagou (o pagador reembolsa a parte dele),
 * negativo quando o pagador pagou (a parte da recebedora vira crédito).
 */
export function efeitoNoDevido(d: Despesa): number {
  if (d.pagaPor === "recebedora") return partes(d).pagador;
  if (d.divisao.tipo === "metade") return -arred(d.valor / 2);
  return -partes(d).recebedora;
}

export function vigente<T extends { vigenciaInicio: string }>(
  lista: T[],
  competencia: string,
): T {
  const ordenada = [...lista].sort((a, b) =>
    a.vigenciaInicio.localeCompare(b.vigenciaInicio),
  );
  let atual: T | undefined;
  for (const item of ordenada) {
    if (item.vigenciaInicio <= competencia) atual = item;
  }
  if (!atual) throw new Error(`Nenhuma vigência cadastrada para ${competencia}`);
  return atual;
}

export function calcularMes(params: {
  competencia: string;
  regras: Regra[];
  salarios: SalarioMinimo[];
  despesas: Despesa[];
  pagamentos: Pagamento[];
}): ResumoMes {
  const { competencia } = params;
  const regra = vigente(params.regras, competencia);
  const sm = vigente(params.salarios, competencia);
  const pensao = arred((sm.valor * regra.percentualPensao) / 100);

  let despesasDecisao = 0;
  let despesasCombinadas = 0;
  for (const d of params.despesas) {
    const efeito = efeitoNoDevido(d);
    if (d.categoria === "decisao") despesasDecisao += efeito;
    else despesasCombinadas += efeito;
  }

  const totalRecibo = pensao + despesasDecisao;
  const totalDemonstrativo = despesasCombinadas;
  const total = totalRecibo + totalDemonstrativo;
  const pago = params.pagamentos.reduce((s, p) => s + p.valor, 0);
  const dia = String(regra.diaVencimento).padStart(2, "0");

  return {
    competencia,
    salarioMinimo: sm.valor,
    percentualPensao: regra.percentualPensao,
    pensao,
    despesasDecisao,
    despesasCombinadas,
    totalRecibo,
    totalDemonstrativo,
    total,
    pago,
    saldo: total - pago,
    vencimento: `${competencia}-${dia}`,
  };
}

export type StatusMes = "quitado" | "aberto" | "atrasado";

export function statusDoMes(resumo: ResumoMes, hoje: string): StatusMes {
  if (resumo.saldo <= 0) return "quitado";
  return hoje > resumo.vencimento ? "atrasado" : "aberto";
}

/** Saldo devedor acumulado (positivo = o pagador deve). */
export function saldoAcumulado(meses: ResumoMes[]): number {
  return meses.reduce((s, m) => s + m.saldo, 0);
}

/** Lista as competências AAAA-MM de `inicio` até `fim`, inclusive. */
export function competencias(inicio: string, fim: string): string[] {
  const out: string[] = [];
  let [a, m] = inicio.split("-").map(Number);
  const [af, mf] = fim.split("-").map(Number);
  while (a < af || (a === af && m <= mf)) {
    out.push(`${a}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return out;
}

export function formatarReais(centavos: number): string {
  const neg = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cents = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}R$ ${reais},${cents}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeDoMes(competencia: string): string {
  const [a, m] = competencia.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

/** Converte "1.234,56", "1234.56" ou "R$ 830,5" em centavos. */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(limpo)) return null;
  const normal = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const v = Math.round(Number(normal) * 100);
  return Number.isFinite(v) && v > 0 ? v : null;
}

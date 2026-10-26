import { efeitoNoDevido, type ResumoMes } from "./calculo";
import { paraDespesa, type LinhaDespesa, type LinhaPagamento } from "./dados-tipos";

export interface ReciboResumo {
  competencia: string;
  tipo: "judicial" | "extra";
  valor_centavos: number;
  confirmado_em: string | null;
  codigo: string | null;
}

export interface LinhaRelatorio {
  competencia: string;
  pensao: number;
  judicial: number;
  extra: number;
  pago: number;
  saldo: number;
  recibos: string; // "judicial confirmado (ABCD-1234); extra pendente"
}

export interface Relatorio {
  linhas: LinhaRelatorio[];
  totais: Omit<LinhaRelatorio, "competencia" | "recibos">;
  despesasJudiciais: { competencia: string; data: string; descricao: string; valor: number; efeito: number; comprovante: string }[];
  pagamentos: { competencia: string; data: string; valor: number; forma: string; comprovante: string }[];
}

function situacao(r: ReciboResumo | undefined, tipo: string): string | null {
  if (!r) return null;
  return r.confirmado_em ? `${tipo} confirmado (${r.codigo})` : `${tipo} aguardando confirmação`;
}

/** Monta o relatório do período, do mês mais antigo para o mais recente. */
export function montarRelatorio(
  meses: ResumoMes[],
  recibos: ReciboResumo[],
  despesas: LinhaDespesa[],
  pagamentos: LinhaPagamento[],
): Relatorio {
  const ordem = [...meses].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const noPeriodo = new Set(ordem.map((m) => m.competencia));
  const linhas = ordem.map((m) => {
    const doMes = recibos.filter((r) => r.competencia === m.competencia);
    const texto = [
      situacao(doMes.find((r) => r.tipo === "judicial"), "judicial"),
      situacao(doMes.find((r) => r.tipo === "extra"), "extra"),
    ].filter(Boolean).join("; ");
    return {
      competencia: m.competencia,
      pensao: m.pensao,
      judicial: m.totalRecibo,
      extra: m.totalDemonstrativo,
      pago: m.pago,
      saldo: m.saldo,
      recibos: texto || "sem recibo",
    };
  });
  const soma = (k: keyof Relatorio["totais"]) => linhas.reduce((s, l) => s + l[k], 0);
  return {
    linhas,
    totais: { pensao: soma("pensao"), judicial: soma("judicial"), extra: soma("extra"), pago: soma("pago"), saldo: soma("saldo") },
    despesasJudiciais: despesas
      .filter((d) => noPeriodo.has(d.competencia) && d.categoria === "decisao" && !d.contestada_em)
      .sort((a, b) => a.competencia.localeCompare(b.competencia) || a.data.localeCompare(b.data))
      .map((d) => ({
        competencia: d.competencia,
        data: d.data,
        descricao: d.descricao,
        valor: d.valor_centavos,
        efeito: efeitoNoDevido(paraDespesa(d)),
        comprovante: d.importado ? "importado da planilha" : "anexado no app",
      })),
    pagamentos: pagamentos
      .filter((p) => noPeriodo.has(p.competencia))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((p) => ({
        competencia: p.competencia,
        data: p.data,
        valor: p.valor_centavos,
        forma: p.forma,
        comprovante: p.importado ? "importado da planilha" : "anexado no app",
      })),
  };
}

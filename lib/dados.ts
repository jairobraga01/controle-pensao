import "server-only";
import { redirect } from "next/navigation";
import {
  calcularMes,
  competencias,
  type Despesa,
  type Pagamento,
  type Parte,
  type Regra,
  type ResumoMes,
  type SalarioMinimo,
} from "./calculo";
import { criarClienteServidor } from "./supabase/server";
import type { TipoDespesa } from "./tipos";

export type Papel = "pagador" | "recebedora" | "advogado";

export interface LinhaDespesa {
  id: string;
  competencia: string;
  descricao: string;
  tipo: TipoDespesa;
  valor_centavos: number;
  data: string;
  paga_por: Parte;
  categoria: "decisao" | "combinada";
  divisao_tipo: "metade" | "integral" | "fixo";
  divisao_responsavel: Parte | null;
  divisao_valor_pagador: number | null;
  lancado_por: string;
  contestada_em: string | null;
  motivo_contestacao: string | null;
}

export interface LinhaPagamento {
  id: string;
  competencia: string;
  valor_centavos: number;
  data: string;
  forma: string;
}

export interface Membro {
  user_id: string;
  papel: Papel;
  nome: string;
  cpf: string | null;
  rg: string | null;
  qualificacao: string | null;
  endereco: string | null;
}

export interface Processo {
  id: string;
  numero: string;
  vara: string;
  cidade: string;
  alimentando_nome: string;
  inicio_competencia: string;
}

export function paraDespesa(l: LinhaDespesa): Despesa {
  const divisao: Despesa["divisao"] =
    l.divisao_tipo === "integral"
      ? { tipo: "integral", responsavel: l.divisao_responsavel ?? "pagador" }
      : l.divisao_tipo === "fixo"
        ? { tipo: "fixo", valorPagador: l.divisao_valor_pagador ?? 0 }
        : { tipo: "metade" };
  return {
    id: l.id,
    descricao: l.descricao,
    valor: l.valor_centavos,
    data: l.data,
    pagaPor: l.paga_por,
    categoria: l.categoria,
    divisao,
  };
}

function paraPagamento(l: LinhaPagamento): Pagamento {
  return { id: l.id, valor: l.valor_centavos, data: l.data };
}

export function hojeISO(): string {
  // Data local de Brasília, para o vencimento do dia 10.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function competenciaAtual(): string {
  return hojeISO().slice(0, 7);
}

/** Usuário logado, o processo dele e as regras. Redireciona se faltar algo. */
export async function carregarContexto() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membro } = await supabase
    .from("membros")
    .select("processo_id, user_id, papel, nome, cpf, rg, qualificacao, endereco")
    .eq("user_id", user.id)
    .order("criado_em")
    .limit(1)
    .maybeSingle();
  if (!membro) redirect("/novo");

  const [{ data: processo }, { data: membros }, { data: regras }, { data: salarios }] =
    await Promise.all([
      supabase.from("processos").select("*").eq("id", membro.processo_id).single(),
      supabase
        .from("membros")
        .select("user_id, papel, nome, cpf, rg, qualificacao, endereco")
        .eq("processo_id", membro.processo_id),
      supabase
        .from("regras")
        .select("vigencia_inicio, percentual_pensao, dia_vencimento")
        .eq("processo_id", membro.processo_id),
      supabase.from("salarios_minimos").select("vigencia_inicio, valor_centavos"),
    ]);

  return {
    supabase,
    user,
    eu: membro as Membro & { processo_id: string },
    processo: processo as Processo,
    membros: (membros ?? []) as Membro[],
    regras: (regras ?? []).map(
      (r): Regra => ({
        vigenciaInicio: r.vigencia_inicio,
        percentualPensao: Number(r.percentual_pensao),
        diaVencimento: r.dia_vencimento,
      }),
    ),
    salarios: (salarios ?? []).map(
      (s): SalarioMinimo => ({ vigenciaInicio: s.vigencia_inicio, valor: s.valor_centavos }),
    ),
  };
}

export type Contexto = Awaited<ReturnType<typeof carregarContexto>>;

export async function carregarLancamentos(ctx: Contexto, competencia?: string) {
  let qd = ctx.supabase.from("despesas").select("*").eq("processo_id", ctx.processo.id);
  let qp = ctx.supabase.from("pagamentos").select("*").eq("processo_id", ctx.processo.id);
  if (competencia) {
    qd = qd.eq("competencia", competencia);
    qp = qp.eq("competencia", competencia);
  }
  const [{ data: despesas }, { data: pagamentos }] = await Promise.all([
    qd.order("data", { ascending: false }),
    qp.order("data", { ascending: false }),
  ]);
  return {
    despesas: (despesas ?? []) as LinhaDespesa[],
    pagamentos: (pagamentos ?? []) as LinhaPagamento[],
  };
}

/** Despesas contestadas ficam fora do cálculo até serem resolvidas. */
export function resumir(
  ctx: Contexto,
  competencia: string,
  despesas: LinhaDespesa[],
  pagamentos: LinhaPagamento[],
): ResumoMes {
  return calcularMes({
    competencia,
    regras: ctx.regras,
    salarios: ctx.salarios,
    despesas: despesas
      .filter((d) => d.competencia === competencia && !d.contestada_em)
      .map(paraDespesa),
    pagamentos: pagamentos.filter((p) => p.competencia === competencia).map(paraPagamento),
  });
}

/** Todos os meses desde o início do processo até o mês atual, mais recente primeiro. */
export async function carregarExtrato(ctx: Contexto) {
  const { despesas, pagamentos } = await carregarLancamentos(ctx);
  const meses = competencias(ctx.processo.inicio_competencia, competenciaAtual())
    .map((c) => resumir(ctx, c, despesas, pagamentos))
    .reverse();
  return { meses, despesas, pagamentos };
}

export function membroPorPapel(ctx: Contexto, papel: Papel): Membro | undefined {
  return ctx.membros.find((m) => m.papel === papel);
}

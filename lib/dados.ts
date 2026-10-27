import "server-only";
import { redirect } from "next/navigation";
import {
  calcularMes,
  competencias,
  type Pagamento,
  type Regra,
  type ResumoMes,
  type SalarioMinimo,
} from "./calculo";
import { contaNoCalculo, paraDespesa, type LinhaDespesa, type LinhaPagamento } from "./dados-tipos";
import { TIPOS_PADRAO, paraTipo, type LinhaTipo, type TipoCadastro } from "./tipos";
import { criarClienteServidor } from "./supabase/server";

export { contaNoCalculo, paraDespesa, type LinhaDespesa, type LinhaPagamento };

export type Papel = "pagador" | "recebedora" | "advogado";

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

/** Despesas contestadas ou pendentes ficam fora do cálculo. */
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
      .filter((d) => d.competencia === competencia && contaNoCalculo(d))
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

/** Tipos de despesa do processo, na ordem do cadastro (inclui os excluídos). */
export async function carregarTipos(ctx: Contexto): Promise<TipoCadastro[]> {
  const { data } = await ctx.supabase
    .from("tipos_despesa")
    .select("codigo, rotulo, detalhe, categoria, divisao_tipo, divisao_responsavel, divisao_valor_pagador, ativo")
    .eq("processo_id", ctx.processo.id)
    .order("ordem")
    .order("rotulo");
  return data?.length ? (data as LinhaTipo[]).map(paraTipo) : TIPOS_PADRAO;
}

export function membroPorPapel(ctx: Contexto, papel: Papel): Membro | undefined {
  return ctx.membros.find((m) => m.papel === papel);
}

"use server";

import { redirect } from "next/navigation";
import { lerReais, type Divisao } from "@/lib/calculo";
import { carregarContexto, carregarTipos, type Contexto } from "@/lib/dados";
import { lerMes } from "@/lib/mes";
import { codigoNovo } from "@/lib/tipos";

function voltar(params: Record<string, string>): never {
  redirect(`/pensao?${new URLSearchParams(params)}`);
}

async function contextoDeParte(): Promise<Contexto> {
  const ctx = await carregarContexto();
  if (ctx.eu.papel === "advogado") voltar({ erro: "Só as partes alteram os dados da pensão." });
  return ctx;
}

const texto = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

export async function salvarPensao(form: FormData) {
  const ctx = await contextoDeParte();
  const inicio = lerMes(texto(form, "inicio"));
  if (!inicio) voltar({ erro: "Informe o primeiro mês como MM/AAAA, por exemplo 10/2024." });
  const percentual = Number(texto(form, "percentual").replace(",", "."));
  const dia = Number(texto(form, "dia"));
  if (!(percentual > 0) || !(dia >= 1 && dia <= 28)) voltar({ erro: "Confira o percentual e o dia do vencimento." });
  const { error } = await ctx.supabase.rpc("atualizar_processo", {
    p: ctx.processo.id,
    p_numero: texto(form, "numero"),
    p_vara: texto(form, "vara"),
    p_cidade: texto(form, "cidade"),
    p_alimentando: texto(form, "alimentando"),
    p_inicio: inicio,
    p_percentual: percentual,
    p_dia: dia,
    p_fundamento: texto(form, "fundamento") || null,
  });
  if (error) voltar({ erro: error.message });
  voltar({ ok: "Dados da pensão salvos." });
}

/** Divisão escolhida no cadastro do tipo; "escolher" deixa a escolha para cada lançamento. */
function lerDivisao(form: FormData): { divisao: Divisao | null } | { erro: string } {
  const v = texto(form, "divisao");
  if (v === "escolher") return { divisao: null };
  if (v === "metade") return { divisao: { tipo: "metade" } };
  if (v === "integral_pagador") return { divisao: { tipo: "integral", responsavel: "pagador" } };
  if (v === "integral_recebedora") return { divisao: { tipo: "integral", responsavel: "recebedora" } };
  if (v === "fixo") {
    const valorPagador = lerReais(texto(form, "valor_fixo"));
    return valorPagador ? { divisao: { tipo: "fixo", valorPagador } } : { erro: "Informe o valor fixo do pai." };
  }
  return { erro: "Escolha a divisão." };
}

function camposDoTipo(form: FormData) {
  const rotulo = texto(form, "rotulo");
  if (!rotulo) voltar({ erro: "Informe o nome do tipo." });
  const categoria = texto(form, "categoria") === "decisao" ? "decisao" : "combinada";
  const d = lerDivisao(form);
  if ("erro" in d) voltar({ erro: d.erro });
  const div = d.divisao;
  return {
    rotulo,
    detalhe: texto(form, "detalhe"),
    categoria,
    divisao_tipo: div?.tipo ?? null,
    divisao_responsavel: div?.tipo === "integral" ? div.responsavel : null,
    divisao_valor_pagador: div?.tipo === "fixo" ? div.valorPagador : null,
  };
}

export async function salvarTipo(form: FormData) {
  const ctx = await contextoDeParte();
  const { error } = await ctx.supabase
    .from("tipos_despesa")
    .update(camposDoTipo(form))
    .eq("processo_id", ctx.processo.id)
    .eq("codigo", texto(form, "codigo"));
  if (error) voltar({ erro: error.message });
  voltar({ ok: "Tipo de despesa salvo. Vale para os próximos lançamentos." });
}

export async function criarTipo(form: FormData) {
  const ctx = await contextoDeParte();
  const campos = camposDoTipo(form);
  const existentes = (await carregarTipos(ctx)).map((t) => t.codigo);
  const { error } = await ctx.supabase.from("tipos_despesa").insert({
    processo_id: ctx.processo.id,
    codigo: codigoNovo(campos.rotulo, existentes),
    ordem: 80,
    ...campos,
  });
  if (error) voltar({ erro: error.message });
  voltar({ ok: `Tipo "${campos.rotulo}" criado.` });
}

/** Excluir um tipo só o tira da lista de lançamento; o que já foi lançado não muda. */
export async function ativarTipo(form: FormData) {
  const ctx = await contextoDeParte();
  const ativo = texto(form, "ativo") === "1";
  const { error } = await ctx.supabase
    .from("tipos_despesa")
    .update({ ativo })
    .eq("processo_id", ctx.processo.id)
    .eq("codigo", texto(form, "codigo"));
  if (error) voltar({ erro: error.message });
  voltar({ ok: ativo ? "Tipo restaurado." : "Tipo excluído da lista de lançamento." });
}

export async function excluirPensao(form: FormData) {
  const ctx = await contextoDeParte();
  if (form.get("confirmo") !== "sim") voltar({ erro: "Marque a confirmação para excluir a pensão." });
  const { error } = await ctx.supabase.rpc("excluir_processo", { p: ctx.processo.id });
  if (error) voltar({ erro: error.message });
  redirect("/novo");
}

/** Inclui ou altera o salário mínimo que vale a partir de um mês. */
export async function salvarSalario(form: FormData) {
  const ctx = await contextoDeParte();
  const mes = lerMes(texto(form, "vigencia"));
  if (!mes) voltar({ erro: "Informe o mês de início como MM/AAAA, por exemplo 01/2027." });
  const valor = lerReais(texto(form, "valor"));
  if (!valor) voltar({ erro: "Informe o valor do salário mínimo." });
  const { error } = await ctx.supabase
    .from("salarios_minimos")
    .upsert({ vigencia_inicio: mes, valor_centavos: valor }, { onConflict: "vigencia_inicio" });
  if (error) voltar({ erro: error.message });
  voltar({ ok: `Salário mínimo de ${mes.split("-").reverse().join("/")} salvo.` });
}

export async function excluirSalario(form: FormData) {
  const ctx = await contextoDeParte();
  const mes = texto(form, "vigencia");
  const { count } = await ctx.supabase.from("salarios_minimos").select("vigencia_inicio", { count: "exact", head: true });
  if ((count ?? 0) <= 1) voltar({ erro: "A tabela precisa de pelo menos um salário mínimo." });
  const { error } = await ctx.supabase.from("salarios_minimos").delete().eq("vigencia_inicio", mes);
  if (error) voltar({ erro: error.message });
  voltar({ ok: `Salário mínimo de ${mes.split("-").reverse().join("/")} excluído.` });
}

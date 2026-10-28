"use server";

import { redirect } from "next/navigation";
import { lerReais } from "@/lib/calculo";
import { enviadosDoForm, registrarEnviados } from "@/lib/comprovantes";
import { carregarContexto, carregarLancamentos, contaNoCalculo, paraDespesa, resumir } from "@/lib/dados";
import { ehTipoRecibo, itensDoRecibo, valorDoRecibo, type TipoRecibo } from "@/lib/recibo";

export async function registrarPagamento(form: FormData) {
  const ctx = await carregarContexto();
  const competencia = String(form.get("competencia"));
  const destino = String(form.get("destino"));
  const erro = (msg: string): never =>
    redirect(`/pagamento?mes=${competencia}&bloco=${destino}&erro=${encodeURIComponent(msg)}`);
  if (!ehTipoRecibo(destino)) erro("Escolha o bloco do pagamento.");

  if (ctx.eu.papel !== "pagador") erro("Só quem paga registra pagamentos.");
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) erro("Valor inválido.");
  const enviados = enviadosDoForm(form, ctx.processo.id);
  if (!enviados.length) erro("Anexe pelo menos um comprovante.");

  // Pendências do bloco marcadas para quitar entram no cálculo deste mês antes do recibo.
  if (form.get("quitar_pendentes") === "1") {
    const { data: pendentes } = await ctx.supabase
      .from("despesas")
      .select("id")
      .eq("processo_id", ctx.processo.id)
      .eq("pendente", true)
      .eq("categoria", destino === "judicial" ? "decisao" : "combinada")
      .is("contestada_em", null);
    for (const p of pendentes ?? []) {
      const { error } = await ctx.supabase.rpc("incluir_pendente", { p_despesa: p.id, p_competencia: competencia });
      if (error) erro(`Não foi possível incluir as pendências: ${error.message}`);
    }
  }

  const { data: pag, error } = await ctx.supabase
    .from("pagamentos")
    .insert({
      processo_id: ctx.processo.id,
      competencia,
      valor_centavos: valor,
      data: String(form.get("data")),
      forma: String(form.get("forma")),
      destino,
      registrado_por: ctx.user.id,
    })
    .select("id")
    .single();
  if (error || !pag) return erro(error?.message ?? "Falha ao salvar o pagamento.");

  try {
    await registrarEnviados(ctx, enviados, { pagamento_id: pag.id });
  } catch (e) {
    erro(`Pagamento salvo, mas o comprovante falhou: ${(e as Error).message}`);
  }

  await gerarRecibo(competencia, destino as TipoRecibo, String(form.get("data")));
  redirect(`/recibos/${competencia}/${destino}`);
}

/** Cria ou atualiza o recibo do bloco pago, enquanto a mãe ainda não confirmou. */
async function gerarRecibo(competencia: string, tipo: TipoRecibo, dataPagamento: string) {
  const ctx = await carregarContexto();
  const { despesas, pagamentos } = await carregarLancamentos(ctx, competencia);
  const resumo = resumir(ctx, competencia, despesas, pagamentos);
  const validas = despesas.filter(contaNoCalculo).map(paraDespesa);
  const { data: existentes } = await ctx.supabase
    .from("recibos")
    .select("id, tipo, confirmado_em")
    .eq("processo_id", ctx.processo.id)
    .eq("competencia", competencia);

  const itens = itensDoRecibo(tipo, resumo, validas);
  const existente = existentes?.find((r) => r.tipo === tipo);
  const linha = {
    processo_id: ctx.processo.id,
    competencia,
    tipo,
    valor_centavos: valorDoRecibo(tipo, resumo),
    itens,
    gerado_por: ctx.user.id,
    gerado_em: new Date().toISOString(),
    data_pagamento: dataPagamento,
  };
  if (!existente) await ctx.supabase.from("recibos").insert(linha);
  else if (!existente.confirmado_em) await ctx.supabase.from("recibos").update(linha).eq("id", existente.id);
}

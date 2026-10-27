"use server";

import { redirect } from "next/navigation";
import { carregarContexto, carregarTipos } from "@/lib/dados";
import { lerCsv } from "@/lib/importacao";

export async function importar(form: FormData) {
  const ctx = await carregarContexto();
  if (ctx.eu.papel !== "pagador") redirect("/");
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    redirect(`/importar?erros=${encodeURIComponent(JSON.stringify(["Escolha um arquivo CSV."]))}`);
  }
  const { despesas, pagamentos, erros } = lerCsv(await arquivo.text(), await carregarTipos(ctx));
  if (erros.length) redirect(`/importar?erros=${encodeURIComponent(JSON.stringify(erros.slice(0, 50)))}`);

  const base = { processo_id: ctx.processo.id, importado: true };
  // A coluna pendente só vai quando há pendentes, para funcionar antes da migração 0005.
  const temPendente = despesas.some((d) => d.pendente);
  if (despesas.length) {
    const { error } = await ctx.supabase.from("despesas").insert(
      despesas.map((d) => ({
        ...base,
        competencia: d.competencia,
        data: d.data,
        descricao: d.descricao,
        tipo: d.tipo,
        valor_centavos: d.valor,
        paga_por: d.pagaPor,
        categoria: d.categoria,
        divisao_tipo: d.divisao.tipo,
        divisao_responsavel: d.divisao.tipo === "integral" ? d.divisao.responsavel : null,
        divisao_valor_pagador: d.divisao.tipo === "fixo" ? d.divisao.valorPagador : null,
        lancado_por: ctx.user.id,
        ...(temPendente ? { pendente: d.pendente } : {}),
      })),
    );
    if (error) redirect(`/importar?erros=${encodeURIComponent(JSON.stringify([error.message]))}`);
  }
  if (pagamentos.length) {
    const { error } = await ctx.supabase.from("pagamentos").insert(
      pagamentos.map((p) => ({
        ...base,
        competencia: p.competencia,
        data: p.data,
        valor_centavos: p.valor,
        forma: p.forma,
        registrado_por: ctx.user.id,
      })),
    );
    if (error) {
      const msg = `As despesas foram importadas, mas os pagamentos falharam: ${error.message}`;
      redirect(`/importar?erros=${encodeURIComponent(JSON.stringify([msg]))}`);
    }
  }
  redirect(`/importar?despesas=${despesas.length}&pagamentos=${pagamentos.length}`);
}

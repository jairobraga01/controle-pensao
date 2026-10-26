"use server";

import { redirect } from "next/navigation";
import { lerReais } from "@/lib/calculo";
import { arquivosDoForm, salvarComprovantes, validarArquivos } from "@/lib/comprovantes";
import { carregarContexto, carregarLancamentos, paraDespesa, resumir } from "@/lib/dados";
import { TIPOS_RECIBO, itensDoRecibo, valorDoRecibo } from "@/lib/recibo";

export async function registrarPagamento(form: FormData) {
  const ctx = await carregarContexto();
  const competencia = String(form.get("competencia"));
  const erro = (msg: string): never =>
    redirect(`/pagamento?mes=${competencia}&erro=${encodeURIComponent(msg)}`);

  if (ctx.eu.papel !== "pagador") erro("Só quem paga registra pagamentos.");
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) erro("Valor inválido.");
  const arquivos = arquivosDoForm(form);
  const problema = validarArquivos(arquivos);
  if (problema) erro(problema);

  const { data: pag, error } = await ctx.supabase
    .from("pagamentos")
    .insert({
      processo_id: ctx.processo.id,
      competencia,
      valor_centavos: valor,
      data: String(form.get("data")),
      forma: String(form.get("forma")),
      registrado_por: ctx.user.id,
    })
    .select("id")
    .single();
  if (error || !pag) return erro(error?.message ?? "Falha ao salvar o pagamento.");

  try {
    await salvarComprovantes(ctx, arquivos, { pagamento_id: pag.id });
  } catch (e) {
    erro(`Pagamento salvo, mas o comprovante falhou: ${(e as Error).message}`);
  }

  await gerarRecibos(competencia);
  redirect(`/recibos/${competencia}/judicial`);
}

/** Cria ou atualiza os recibos do mês, enquanto a mãe ainda não confirmou. */
async function gerarRecibos(competencia: string) {
  const ctx = await carregarContexto();
  const { despesas, pagamentos } = await carregarLancamentos(ctx, competencia);
  const resumo = resumir(ctx, competencia, despesas, pagamentos);
  const validas = despesas.filter((d) => !d.contestada_em).map(paraDespesa);
  const { data: existentes } = await ctx.supabase
    .from("recibos")
    .select("id, tipo, confirmado_em")
    .eq("processo_id", ctx.processo.id)
    .eq("competencia", competencia);

  for (const tipo of TIPOS_RECIBO) {
    const itens = itensDoRecibo(tipo, resumo, validas);
    const existente = existentes?.find((r) => r.tipo === tipo);
    // Mês sem despesas combinadas não tem recibo extra.
    if (tipo === "extra" && itens.length === 0 && !existente) continue;
    const linha = {
      processo_id: ctx.processo.id,
      competencia,
      tipo,
      valor_centavos: valorDoRecibo(tipo, resumo),
      itens,
      gerado_por: ctx.user.id,
      gerado_em: new Date().toISOString(),
    };
    if (!existente) await ctx.supabase.from("recibos").insert(linha);
    else if (!existente.confirmado_em) await ctx.supabase.from("recibos").update(linha).eq("id", existente.id);
  }
}

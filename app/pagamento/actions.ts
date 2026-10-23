"use server";

import { redirect } from "next/navigation";
import { lerReais } from "@/lib/calculo";
import { arquivosDoForm, salvarComprovantes, validarArquivos } from "@/lib/comprovantes";
import { carregarContexto, carregarLancamentos, paraDespesa, resumir } from "@/lib/dados";
import { itensDoRecibo } from "@/lib/recibo";

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

  await gerarRecibo(competencia);
  redirect(`/recibos/${competencia}`);
}

/** Cria ou atualiza o recibo do mês, enquanto a mãe ainda não confirmou. */
async function gerarRecibo(competencia: string) {
  const ctx = await carregarContexto();
  const { despesas, pagamentos } = await carregarLancamentos(ctx, competencia);
  const resumo = resumir(ctx, competencia, despesas, pagamentos);
  const validas = despesas.filter((d) => !d.contestada_em).map(paraDespesa);
  const linha = {
    processo_id: ctx.processo.id,
    competencia,
    valor_centavos: resumo.totalRecibo,
    itens: itensDoRecibo(resumo, validas),
    gerado_por: ctx.user.id,
    gerado_em: new Date().toISOString(),
  };
  const { data: existente } = await ctx.supabase
    .from("recibos")
    .select("id, confirmado_em")
    .eq("processo_id", ctx.processo.id)
    .eq("competencia", competencia)
    .maybeSingle();
  if (!existente) await ctx.supabase.from("recibos").insert(linha);
  else if (!existente.confirmado_em) await ctx.supabase.from("recibos").update(linha).eq("id", existente.id);
}

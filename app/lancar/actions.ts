"use server";

import { redirect } from "next/navigation";
import { enviadosDoForm, registrarEnviados } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";
import { lerCamposDespesa, paginaDeVolta, voltarComErro } from "@/lib/form-despesa";
import { gerarParcelas, MAX_PARCELAS } from "@/lib/parcelas";

export async function lancarDespesa(form: FormData) {
  const voltar = paginaDeVolta(form, "/lancar");
  const ctx = await carregarContexto();
  const campos = await lerCamposDespesa(form, ctx, voltar);
  const pendente = form.get("pendente") === "1";
  // Parcelado: uma despesa por mês a partir do mês escolhido (pendentes não parcelam).
  const n = pendente ? 1 : Number(form.get("parcelas") ?? 1) || 1;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARCELAS) voltarComErro(voltar, "Número de parcelas inválido.");
  if (campos.valor_centavos < n) voltarComErro(voltar, "Valor pequeno demais para tantas parcelas.");
  // Comprovante é opcional: pode ser anexado depois, na tela da despesa.
  const enviados = enviadosDoForm(form, ctx.processo.id);

  const linhas = gerarParcelas(campos, n).map((p) => ({
    processo_id: ctx.processo.id,
    ...campos,
    competencia: p.competencia,
    descricao: p.descricao,
    valor_centavos: p.valor_centavos,
    divisao_valor_pagador: p.divisao_valor_pagador,
    lancado_por: ctx.user.id,
    // Só manda o campo quando marcado, para funcionar antes da migração 0005.
    ...(pendente ? { pendente: true } : {}),
  }));
  const { data, error } = await ctx.supabase.from("despesas").insert(linhas).select("id, competencia");
  if (error || !data?.length) voltarComErro(voltar, error?.message ?? "Não foi possível salvar a despesa.");
  const primeira = data.reduce((a, b) => (b.competencia < a.competencia ? b : a));

  try {
    // O comprovante da compra fica na 1ª parcela.
    await registrarEnviados(ctx, enviados, { despesa_id: primeira.id });
  } catch (e) {
    voltarComErro(voltar, `Despesa salva, mas o comprovante falhou: ${(e as Error).message}`);
  }
  redirect(voltar === "/lancar" ? `/despesas/${primeira.id}` : voltar);
}

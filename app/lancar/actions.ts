"use server";

import { redirect } from "next/navigation";
import { lerReais } from "@/lib/calculo";
import { arquivosDoForm, salvarComprovantes, validarArquivos } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";

function voltarComErro(msg: string): never {
  redirect(`/lancar?erro=${encodeURIComponent(msg)}`);
}

export async function lancarDespesa(form: FormData) {
  const ctx = await carregarContexto();
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) voltarComErro("Valor inválido.");

  const divisao = String(form.get("divisao"));
  let divisao_tipo = "metade";
  let divisao_responsavel: string | null = null;
  let divisao_valor_pagador: number | null = null;
  if (divisao.startsWith("integral_")) {
    divisao_tipo = "integral";
    divisao_responsavel = divisao.replace("integral_", "");
  } else if (divisao === "fixo") {
    divisao_tipo = "fixo";
    divisao_valor_pagador = lerReais(String(form.get("valor_fixo") ?? ""));
    if (!divisao_valor_pagador) voltarComErro("Informe o valor fixo do pai.");
  }

  const arquivos = arquivosDoForm(form);
  const problema = validarArquivos(arquivos);
  if (problema) voltarComErro(problema);

  const { data, error } = await ctx.supabase
    .from("despesas")
    .insert({
      processo_id: ctx.processo.id,
      competencia: String(form.get("competencia")),
      descricao: String(form.get("descricao")).trim(),
      valor_centavos: valor,
      data: String(form.get("data")),
      paga_por: String(form.get("paga_por")),
      categoria: String(form.get("categoria")),
      divisao_tipo,
      divisao_responsavel,
      divisao_valor_pagador,
      lancado_por: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) voltarComErro(error.message);

  try {
    await salvarComprovantes(ctx, arquivos, { despesa_id: data.id });
  } catch (e) {
    voltarComErro(`Despesa salva, mas o comprovante falhou: ${(e as Error).message}`);
  }
  redirect(`/despesas/${data.id}`);
}

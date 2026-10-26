"use server";

import { redirect } from "next/navigation";
import { lerReais, type Divisao } from "@/lib/calculo";
import { arquivosDoForm, salvarComprovantes, validarArquivos } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";
import { lerMes } from "@/lib/mes";
import { ehTipo, regraDoTipo } from "@/lib/tipos";

function voltarComErro(msg: string): never {
  redirect(`/lancar?erro=${encodeURIComponent(msg)}`);
}

/** Divisão escolhida à mão, usada só no tipo "outra". */
function divisaoManual(form: FormData): Divisao | null {
  const v = String(form.get("divisao") ?? "");
  if (v === "metade") return { tipo: "metade" };
  if (v === "integral_pagador") return { tipo: "integral", responsavel: "pagador" };
  if (v === "integral_recebedora") return { tipo: "integral", responsavel: "recebedora" };
  if (v === "fixo") {
    const valorPagador = lerReais(String(form.get("valor_fixo") ?? ""));
    if (!valorPagador) voltarComErro("Informe o valor fixo do pai.");
    return { tipo: "fixo", valorPagador };
  }
  return null;
}

export async function lancarDespesa(form: FormData) {
  const ctx = await carregarContexto();
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) voltarComErro("Valor inválido.");
  const competencia = lerMes(String(form.get("competencia") ?? ""));
  if (!competencia) voltarComErro("Informe o mês como MM/AAAA, por exemplo 10/2024.");

  const tipo = String(form.get("tipo"));
  if (!ehTipo(tipo)) voltarComErro("Escolha o tipo de despesa.");
  const manual = divisaoManual(form);
  if (tipo === "outra" && !manual) voltarComErro("Escolha a divisão da despesa.");
  const regra = regraDoTipo(tipo, manual ?? undefined);
  const d = regra.divisao;

  const arquivos = arquivosDoForm(form);
  const problema = validarArquivos(arquivos);
  if (problema) voltarComErro(problema);

  const { data, error } = await ctx.supabase
    .from("despesas")
    .insert({
      processo_id: ctx.processo.id,
      competencia,
      descricao: String(form.get("descricao")).trim(),
      valor_centavos: valor,
      data: String(form.get("data")),
      paga_por: String(form.get("paga_por")),
      tipo,
      categoria: regra.categoria,
      divisao_tipo: d.tipo,
      divisao_responsavel: d.tipo === "integral" ? d.responsavel : null,
      divisao_valor_pagador: d.tipo === "fixo" ? d.valorPagador : null,
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

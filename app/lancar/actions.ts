"use server";

import { redirect } from "next/navigation";
import { lerReais, type Divisao } from "@/lib/calculo";
import { arquivosDoForm, salvarComprovantes, validarArquivos } from "@/lib/comprovantes";
import { carregarContexto, carregarTipos } from "@/lib/dados";
import { lerMes } from "@/lib/mes";
import { acharTipo, regraDoTipo } from "@/lib/tipos";

/** Página de onde o formulário veio (a tela inicial também lança despesas). */
function paginaDeVolta(form: FormData): string {
  const v = String(form.get("voltar") ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/lancar";
}

function voltarComErro(pagina: string, msg: string): never {
  redirect(`${pagina}${pagina.includes("?") ? "&" : "?"}erro=${encodeURIComponent(msg)}`);
}

/** Divisão escolhida à mão, para tipos sem divisão própria. */
function divisaoManual(form: FormData, voltar: string): Divisao | null {
  const v = String(form.get("divisao") ?? "");
  if (v === "metade") return { tipo: "metade" };
  if (v === "integral_pagador") return { tipo: "integral", responsavel: "pagador" };
  if (v === "integral_recebedora") return { tipo: "integral", responsavel: "recebedora" };
  if (v === "fixo") {
    const valorPagador = lerReais(String(form.get("valor_fixo") ?? ""));
    if (!valorPagador) voltarComErro(voltar, "Informe o valor fixo do pai.");
    return { tipo: "fixo", valorPagador };
  }
  return null;
}

export async function lancarDespesa(form: FormData) {
  const voltar = paginaDeVolta(form);
  const ctx = await carregarContexto();
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) voltarComErro(voltar, "Valor inválido.");
  const competencia = lerMes(String(form.get("competencia") ?? ""));
  if (!competencia) voltarComErro(voltar, "Informe o mês como MM/AAAA, por exemplo 10/2024.");

  const tipos = (await carregarTipos(ctx)).filter((t) => t.ativo);
  const tipo = acharTipo(tipos, String(form.get("tipo")));
  if (!tipo) voltarComErro(voltar, "Escolha o tipo de despesa.");
  const manual = divisaoManual(form, voltar);
  if (!tipo.divisao && !manual) voltarComErro(voltar, "Escolha a divisão da despesa.");
  const regra = regraDoTipo(tipo, manual ?? undefined);
  const d = regra.divisao;

  const arquivos = arquivosDoForm(form);
  const problema = validarArquivos(arquivos);
  if (problema) voltarComErro(voltar, problema);

  const { data, error } = await ctx.supabase
    .from("despesas")
    .insert({
      processo_id: ctx.processo.id,
      competencia,
      descricao: String(form.get("descricao")).trim(),
      valor_centavos: valor,
      data: String(form.get("data")),
      paga_por: String(form.get("paga_por")),
      tipo: tipo.codigo,
      categoria: regra.categoria,
      divisao_tipo: d.tipo,
      divisao_responsavel: d.tipo === "integral" ? d.responsavel : null,
      divisao_valor_pagador: d.tipo === "fixo" ? d.valorPagador : null,
      lancado_por: ctx.user.id,
      // Só manda o campo quando marcado, para funcionar antes da migração 0005.
      ...(form.get("pendente") === "1" ? { pendente: true } : {}),
    })
    .select("id")
    .single();
  if (error) voltarComErro(voltar, error.message);

  try {
    await salvarComprovantes(ctx, arquivos, { despesa_id: data.id });
  } catch (e) {
    voltarComErro(voltar, `Despesa salva, mas o comprovante falhou: ${(e as Error).message}`);
  }
  redirect(voltar === "/lancar" ? `/despesas/${data.id}` : voltar);
}

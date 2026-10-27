import "server-only";
import { redirect } from "next/navigation";
import { lerReais, type Divisao } from "./calculo";
import { carregarTipos, type Contexto } from "./dados";
import { lerMes } from "./mes";
import { acharTipo, regraDoTipo } from "./tipos";

// Leitura do formulário de despesa, usada ao lançar e ao alterar.

/** Página de onde o formulário veio (a tela inicial e a de despesas também lançam). */
export function paginaDeVolta(form: FormData, padrao: string): string {
  const v = String(form.get("voltar") ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : padrao;
}

export function voltarComErro(pagina: string, msg: string): never {
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

/** Colunas da despesa a partir do formulário; volta com erro se algo estiver inválido. */
export async function lerCamposDespesa(form: FormData, ctx: Contexto, voltar: string) {
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) voltarComErro(voltar, "Valor inválido.");
  const competencia = lerMes(String(form.get("competencia") ?? ""));
  if (!competencia) voltarComErro(voltar, "Informe o mês como MM/AAAA, por exemplo 10/2024.");
  const descricao = String(form.get("descricao") ?? "").trim();
  if (!descricao) voltarComErro(voltar, "Informe a descrição.");
  const pagaPor = String(form.get("paga_por"));
  if (pagaPor !== "pagador" && pagaPor !== "recebedora") voltarComErro(voltar, "Informe quem pagou.");

  const tipos = (await carregarTipos(ctx)).filter((t) => t.ativo);
  const tipo = acharTipo(tipos, String(form.get("tipo")));
  if (!tipo) voltarComErro(voltar, "Escolha o tipo de despesa.");
  const manual = divisaoManual(form, voltar);
  if (!tipo.divisao && !manual) voltarComErro(voltar, "Escolha a divisão da despesa.");
  const regra = regraDoTipo(tipo, manual ?? undefined);
  const d = regra.divisao;

  return {
    competencia,
    descricao,
    valor_centavos: valor,
    data: String(form.get("data")),
    paga_por: pagaPor,
    tipo: tipo.codigo,
    categoria: regra.categoria,
    divisao_tipo: d.tipo,
    divisao_responsavel: d.tipo === "integral" ? d.responsavel : null,
    divisao_valor_pagador: d.tipo === "fixo" ? d.valorPagador : null,
  };
}

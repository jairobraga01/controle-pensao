"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enviadosDoForm, registrarEnviados } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";
import { lerCamposDespesa, voltarComErro } from "@/lib/form-despesa";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function contestar(form: FormData) {
  const id = String(form.get("id"));
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("contestar_despesa", {
    p_despesa: id,
    p_motivo: String(form.get("motivo")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/despesas/${id}`);
}

const SEM_PERMISSAO =
  "Não foi possível salvar. Só quem lançou altera a despesa, e não depois que o recibo do mês foi confirmado.";

export async function alterarDespesa(form: FormData) {
  const id = String(form.get("id"));
  const pagina = `/despesas/${id}`;
  const tela = `/lancar?editar=${id}`;
  const ctx = await carregarContexto();
  const campos = await lerCamposDespesa(form, ctx, tela);
  const { data, error } = await ctx.supabase.from("despesas").update(campos).eq("id", id).select("id");
  if (error) voltarComErro(tela, error.message);
  if (!data?.length) voltarComErro(tela, SEM_PERMISSAO);
  try {
    await registrarEnviados(ctx, enviadosDoForm(form, ctx.processo.id), { despesa_id: id });
  } catch (e) {
    voltarComErro(pagina, `Despesa alterada, mas o comprovante falhou: ${(e as Error).message}`);
  }
  revalidatePath(pagina);
  redirect(`${pagina}?ok=alterada`);
}

export async function excluirDespesa(form: FormData) {
  const id = String(form.get("id"));
  const pagina = `/despesas/${id}`;
  if (form.get("confirmo") !== "1") voltarComErro(pagina, "Marque a confirmação para excluir.");
  const ctx = await carregarContexto();
  const { data: anexos } = await ctx.supabase.from("comprovantes").select("id, caminho").eq("despesa_id", id);
  if (anexos?.length) {
    const { error } = await ctx.supabase.from("comprovantes").delete().eq("despesa_id", id);
    if (error) voltarComErro(pagina, error.message);
  }
  const { data, error } = await ctx.supabase.from("despesas").delete().eq("id", id).select("competencia");
  if (error) voltarComErro(pagina, error.message);
  if (!data?.length) voltarComErro(pagina, SEM_PERMISSAO);
  if (anexos?.length) await ctx.supabase.storage.from("comprovantes").remove(anexos.map((a) => a.caminho));
  redirect(`/despesas?mes=${data[0].competencia}`);
}

export async function anexarComprovante(form: FormData) {
  const id = String(form.get("id"));
  const pagina = `/despesas/${id}`;
  const ctx = await carregarContexto();
  const enviados = enviadosDoForm(form, ctx.processo.id);
  if (!enviados.length) voltarComErro(pagina, "Escolha o arquivo do comprovante.");
  try {
    await registrarEnviados(ctx, enviados, { despesa_id: id });
  } catch (e) {
    voltarComErro(pagina, (e as Error).message);
  }
  revalidatePath(pagina);
}

export async function excluirComprovante(form: FormData) {
  const id = String(form.get("id"));
  const pagina = `/despesas/${id}`;
  const ctx = await carregarContexto();
  const { data, error } = await ctx.supabase
    .from("comprovantes")
    .delete()
    .eq("id", String(form.get("comprovante")))
    .eq("despesa_id", id)
    .select("caminho");
  if (error) voltarComErro(pagina, error.message);
  if (!data?.length) voltarComErro(pagina, SEM_PERMISSAO);
  await ctx.supabase.storage.from("comprovantes").remove(data.map((c) => c.caminho));
  revalidatePath(pagina);
}

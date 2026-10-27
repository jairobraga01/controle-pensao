"use server";

import { redirect } from "next/navigation";
import { enviadosDoForm, registrarEnviados } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";
import { lerCamposDespesa, paginaDeVolta, voltarComErro } from "@/lib/form-despesa";

export async function lancarDespesa(form: FormData) {
  const voltar = paginaDeVolta(form, "/lancar");
  const ctx = await carregarContexto();
  const campos = await lerCamposDespesa(form, ctx, voltar);
  // Comprovante é opcional: pode ser anexado depois, na tela da despesa.
  const enviados = enviadosDoForm(form, ctx.processo.id);

  const { data, error } = await ctx.supabase
    .from("despesas")
    .insert({
      processo_id: ctx.processo.id,
      ...campos,
      lancado_por: ctx.user.id,
      // Só manda o campo quando marcado, para funcionar antes da migração 0005.
      ...(form.get("pendente") === "1" ? { pendente: true } : {}),
    })
    .select("id")
    .single();
  if (error) voltarComErro(voltar, error.message);

  try {
    await registrarEnviados(ctx, enviados, { despesa_id: data.id });
  } catch (e) {
    voltarComErro(voltar, `Despesa salva, mas o comprovante falhou: ${(e as Error).message}`);
  }
  redirect(voltar === "/lancar" ? `/despesas/${data.id}` : voltar);
}

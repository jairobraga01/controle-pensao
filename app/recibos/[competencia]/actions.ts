"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { arquivosDoForm, salvarComprovantes } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";

export async function confirmar(form: FormData) {
  const ctx = await carregarContexto();
  const competencia = String(form.get("competencia"));
  const { error } = await ctx.supabase.rpc("confirmar_recibo", { p_recibo: String(form.get("id")) });
  if (error) redirect(`/recibos/${competencia}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath(`/recibos/${competencia}`);
}

export async function anexarAssinado(form: FormData) {
  const ctx = await carregarContexto();
  const competencia = String(form.get("competencia"));
  const arquivos = arquivosDoForm(form).filter((a) => a.type === "application/pdf");
  if (!arquivos.length) redirect(`/recibos/${competencia}?erro=${encodeURIComponent("Envie o PDF assinado.")}`);
  await salvarComprovantes(ctx, arquivos, { recibo_id: String(form.get("id")) });
  revalidatePath(`/recibos/${competencia}`);
}

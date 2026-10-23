"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { arquivosDoForm, salvarComprovantes } from "@/lib/comprovantes";
import { carregarContexto } from "@/lib/dados";

function destino(form: FormData) {
  const volta = String(form.get("volta") ?? "");
  return /^\/recibos\/\d{4}-\d{2}\/(judicial|extra)$/.test(volta) ? volta : "/recibos";
}

export async function confirmar(form: FormData) {
  const ctx = await carregarContexto();
  const volta = destino(form);
  const { error } = await ctx.supabase.rpc("confirmar_recibo", { p_recibo: String(form.get("id")) });
  if (error) redirect(`${volta}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath(volta);
}

export async function anexarAssinado(form: FormData) {
  const ctx = await carregarContexto();
  const volta = destino(form);
  const arquivos = arquivosDoForm(form).filter((a) => a.type === "application/pdf");
  if (!arquivos.length) redirect(`${volta}?erro=${encodeURIComponent("Envie o PDF assinado.")}`);
  await salvarComprovantes(ctx, arquivos, { recibo_id: String(form.get("id")) });
  revalidatePath(volta);
}

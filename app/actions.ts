"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Tira a despesa de pendente e a coloca no cálculo do mês escolhido na tela inicial. */
export async function incluirPendente(form: FormData) {
  const mes = String(form.get("mes"));
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("incluir_pendente", {
    p_despesa: String(form.get("id")),
    p_competencia: mes,
  });
  if (error) redirect(`/?mes=${mes}&erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
}

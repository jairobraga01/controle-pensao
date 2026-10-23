"use server";

import { revalidatePath } from "next/cache";
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

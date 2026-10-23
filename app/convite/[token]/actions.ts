"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function aceitar(form: FormData) {
  const token = String(form.get("token"));
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("aceitar_convite", {
    p_token: token,
    p_nome: String(form.get("nome")),
  });
  if (error) redirect(`/convite/${token}?erro=${encodeURIComponent(error.message)}`);
  redirect("/");
}

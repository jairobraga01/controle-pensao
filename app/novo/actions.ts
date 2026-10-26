"use server";

import { redirect } from "next/navigation";
import { lerMes } from "@/lib/mes";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function criarProcesso(form: FormData) {
  const inicio = lerMes(String(form.get("inicio") ?? ""));
  if (!inicio) redirect(`/novo?erro=${encodeURIComponent("Informe o primeiro mês como MM/AAAA, por exemplo 10/2024.")}`);
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("criar_processo", {
    p_numero: String(form.get("numero")),
    p_vara: String(form.get("vara")),
    p_cidade: String(form.get("cidade")),
    p_alimentando: String(form.get("alimentando")),
    p_inicio: inicio,
    p_papel: String(form.get("papel")),
    p_nome: String(form.get("nome")),
    p_percentual: Number(form.get("percentual")),
    p_dia: Number(form.get("dia")),
    p_fundamento: String(form.get("fundamento") ?? "") || null,
  });
  if (error) redirect(`/novo?erro=${encodeURIComponent(error.message)}`);
  redirect("/");
}

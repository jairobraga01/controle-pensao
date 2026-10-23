"use server";

import { redirect } from "next/navigation";
import { carregarContexto } from "@/lib/dados";

export async function salvarPerfil(form: FormData) {
  const ctx = await carregarContexto();
  const texto = (k: string) => {
    const v = form.get(k);
    return v === null ? undefined : String(v).trim() || null;
  };
  const { error } = await ctx.supabase
    .from("membros")
    .update({
      nome: texto("nome") ?? ctx.eu.nome,
      cpf: texto("cpf"),
      rg: texto("rg"),
      qualificacao: texto("qualificacao"),
      endereco: texto("endereco"),
    })
    .eq("processo_id", ctx.processo.id)
    .eq("user_id", ctx.user.id);
  if (error) throw new Error(error.message);
  redirect("/perfil?ok=1");
}

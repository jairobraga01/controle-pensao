"use server";

import { redirect } from "next/navigation";
import { carregarContexto } from "@/lib/dados";

export async function convidar(form: FormData) {
  const ctx = await carregarContexto();
  const { data, error } = await ctx.supabase
    .from("convites")
    .insert({
      processo_id: ctx.processo.id,
      email: String(form.get("email")).trim().toLowerCase(),
      papel: String(form.get("papel")),
    })
    .select("token")
    .single();
  if (error) redirect(`/convidar?erro=${encodeURIComponent(error.message)}`);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  redirect(`/convidar?link=${encodeURIComponent(`${site}/convite/${data.token}`)}`);
}

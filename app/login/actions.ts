"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function entrar(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const voltar = String(form.get("voltar") ?? "/");
  const supabase = await criarClienteServidor();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}/auth/callback?voltar=${encodeURIComponent(voltar)}` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent("Não foi possível enviar o link. Tente de novo.")}`);
  redirect("/login?enviado=1");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

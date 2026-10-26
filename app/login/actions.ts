"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

function destino(form: FormData) {
  const v = String(form.get("voltar") ?? "/");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

function voltarAoLogin(form: FormData, params: Record<string, string>): never {
  const q = new URLSearchParams({ ...params, voltar: destino(form) });
  redirect(`/login?${q}`);
}

const SEM_CONEXAO = "O app não conseguiu falar com o servidor. Confira a configuração (variáveis do Supabase na Vercel).";

/** Falha de rede ou de configuração, e não de senha ou e-mail. */
function semConexao(error: { name?: string; status?: number }) {
  return error.name === "AuthRetryableFetchError" || !error.status;
}

function credenciais(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("senha") ?? ""),
  };
}

export async function entrar(form: FormData) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword(credenciais(form));
  if (error) {
    const msg = semConexao(error)
      ? SEM_CONEXAO
      : error.code === "email_not_confirmed"
        ? "Confirme o seu e-mail pelo link que enviamos antes de entrar."
        : "E-mail ou senha incorretos.";
    voltarAoLogin(form, { erro: msg });
  }
  redirect(destino(form));
}

export async function criarConta(form: FormData) {
  const { email, password } = credenciais(form);
  if (password.length < 8) voltarAoLogin(form, { erro: "A senha precisa ter pelo menos 8 caracteres." });
  const supabase = await criarClienteServidor();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${site}/auth/callback?voltar=${encodeURIComponent(destino(form))}` },
  });
  if (error) {
    const msg = semConexao(error)
      ? SEM_CONEXAO
      : error.code === "user_already_exists"
        ? "Já existe uma conta com esse e-mail. Use Entrar."
        : "Não foi possível criar a conta. Tente de novo.";
    voltarAoLogin(form, { erro: msg });
  }
  // Sem confirmação de e-mail no Supabase, a conta já entra logada.
  if (data.session) redirect(destino(form));
  voltarAoLogin(form, { enviado: "1" });
}

/** Esqueceu a senha: entra por um link no e-mail e troca a senha em Meus dados. */
export async function receberLink(form: FormData) {
  const supabase = await criarClienteServidor();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: String(form.get("email") ?? "").trim(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${site}/auth/callback?voltar=${encodeURIComponent("/perfil")}`,
    },
  });
  if (error) voltarAoLogin(form, { erro: semConexao(error) ? SEM_CONEXAO : "Não foi possível enviar o link. Tente de novo." });
  voltarAoLogin(form, { enviado: "1" });
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

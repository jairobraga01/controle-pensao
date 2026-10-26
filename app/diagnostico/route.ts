import { NextResponse } from "next/server";

// Mostra se o app enxerga o Supabase. Só usa valores públicos (URL e chave anon).
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const resultado: Record<string, unknown> = {
    NEXT_PUBLIC_SUPABASE_URL: url === undefined ? "(faltando)" : JSON.stringify(url),
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      chave === undefined ? "(faltando)" : `${chave.length} caracteres, começa com ${JSON.stringify(chave.slice(0, 12))}`,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "(faltando)",
  };
  if (url && chave) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: chave }, cache: "no-store" });
      resultado.conexao = r.ok ? "ok" : `resposta ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      resultado.conexao = `falhou: ${e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause ?? "")}` : String(e)}`;
    }
  }
  return NextResponse.json(resultado);
}

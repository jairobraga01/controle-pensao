import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const voltar = url.searchParams.get("voltar") ?? "/";
  const destino = voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }
  return NextResponse.redirect(new URL("/login?erro=Link%20inv%C3%A1lido%20ou%20expirado", url.origin));
}

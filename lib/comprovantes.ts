import "server-only";
import type { Contexto } from "./dados";

/** Comprovantes que o navegador já enviou ao armazenamento (só da pasta do processo). */
export function enviadosDoForm(form: FormData, processoId: string): { caminho: string; nome: string }[] {
  const caminhos = form.getAll("comprovante_caminho").map(String);
  const nomes = form.getAll("comprovante_nome").map(String);
  return caminhos
    .map((caminho, i) => ({ caminho, nome: nomes[i] || caminho.split("/").pop() || "comprovante" }))
    .filter((c) => c.caminho.startsWith(`${processoId}/`) && !c.caminho.includes(".."));
}

/** Registra os comprovantes enviados pelo navegador, ligados ao lançamento. */
export async function registrarEnviados(
  ctx: Contexto,
  enviados: { caminho: string; nome: string }[],
  vinculo: { despesa_id?: string; pagamento_id?: string; recibo_id?: string },
) {
  if (!enviados.length) return;
  const { error } = await ctx.supabase.from("comprovantes").insert(
    enviados.map((c) => ({ processo_id: ctx.processo.id, caminho: c.caminho, nome_arquivo: c.nome, ...vinculo })),
  );
  if (error) throw new Error(error.message);
}

export async function linksDosComprovantes(ctx: Contexto, filtro: { coluna: string; id: string }) {
  const { data } = await ctx.supabase
    .from("comprovantes")
    .select("id, caminho, nome_arquivo, enviado_em")
    .eq(filtro.coluna, filtro.id)
    .order("enviado_em");
  const lista = data ?? [];
  if (!lista.length) return [];
  const { data: assinadas } = await ctx.supabase.storage
    .from("comprovantes")
    .createSignedUrls(lista.map((c) => c.caminho), 60 * 10);
  return lista.map((c, i) => ({ ...c, url: assinadas?.[i]?.signedUrl ?? null }));
}

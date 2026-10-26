import "server-only";
import type { Contexto } from "./dados";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const LIMITE = 10 * 1024 * 1024;

export function arquivosDoForm(form: FormData, campo = "comprovante"): File[] {
  return form.getAll(campo).filter((f): f is File => f instanceof File && f.size > 0);
}

export function validarArquivos(arquivos: File[]): string | null {
  if (arquivos.length === 0) return "Anexe pelo menos um comprovante.";
  for (const a of arquivos) {
    if (!TIPOS.includes(a.type)) return `Formato não aceito: ${a.name}. Use PDF, JPG ou PNG.`;
    if (a.size > LIMITE) return `${a.name} passa de 10 MB.`;
  }
  return null;
}

/** Envia os arquivos para o bucket e registra cada um ligado ao lançamento. */
export async function salvarComprovantes(
  ctx: Contexto,
  arquivos: File[],
  vinculo: { despesa_id?: string; pagamento_id?: string; recibo_id?: string },
) {
  for (const arquivo of arquivos) {
    const seguro = arquivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const caminho = `${ctx.processo.id}/${crypto.randomUUID()}-${seguro}`;
    const { error: erroEnvio } = await ctx.supabase.storage
      .from("comprovantes")
      .upload(caminho, arquivo, { contentType: arquivo.type });
    if (erroEnvio) throw new Error(`Falha ao enviar ${arquivo.name}: ${erroEnvio.message}`);
    const { error } = await ctx.supabase.from("comprovantes").insert({
      processo_id: ctx.processo.id,
      caminho,
      nome_arquivo: arquivo.name,
      ...vinculo,
    });
    if (error) throw new Error(error.message);
  }
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

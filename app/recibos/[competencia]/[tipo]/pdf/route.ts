import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatarReais } from "@/lib/calculo";
import { carregarContexto, membroPorPapel } from "@/lib/dados";
import { TITULO_RECIBO, dataDoRecibo, ehTipoRecibo, textoDoRecibo, type ItemRecibo } from "@/lib/recibo";

const MARGEM = 64;
const LARGURA = 595.28; // A4
const ALTURA = 841.89;

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ competencia: string; tipo: string }> },
) {
  const { competencia, tipo } = await params;
  if (!ehTipoRecibo(tipo)) return new Response("Recibo não encontrado", { status: 404 });
  const ctx = await carregarContexto();
  const { data: recibo } = await ctx.supabase
    .from("recibos")
    .select("*")
    .eq("processo_id", ctx.processo.id)
    .eq("competencia", competencia)
    .eq("tipo", tipo)
    .maybeSingle();
  if (!recibo) return new Response("Recibo não encontrado", { status: 404 });

  const mae = membroPorPapel(ctx, "recebedora");
  const pai = membroPorPapel(ctx, "pagador");
  const paragrafos = textoDoRecibo({
    tipo,
    recebedora: mae ?? { nome: "[nome da mãe]", qualificacao: null, cpf: null, rg: null, endereco: null },
    pagador: pai ?? { nome: "[nome do pai]", cpf: null, rg: null },
    alimentando: ctx.processo.alimentando_nome,
    competencia,
    valor: recibo.valor_centavos,
    processo: ctx.processo,
  });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Recibo ${tipo} ${competencia}`);
  const pagina = pdf.addPage([LARGURA, ALTURA]);
  const normal = await pdf.embedFont(StandardFonts.TimesRoman);
  const negrito = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const util = LARGURA - 2 * MARGEM;
  let y = ALTURA - MARGEM - 20;

  const titulo = TITULO_RECIBO[tipo];
  pagina.drawText(titulo, {
    x: (LARGURA - negrito.widthOfTextAtSize(titulo, 14)) / 2,
    y,
    size: 14,
    font: negrito,
  });
  y -= 40;

  const escrever = (texto: string) => {
    for (const linha of quebrar(texto, normal, 12, util)) {
      pagina.drawText(linha, { x: MARGEM, y, size: 12, font: normal });
      y -= 18;
    }
    y -= 10;
  };

  escrever(paragrafos[0]);
  escrever(paragrafos[1]);

  for (const item of recibo.itens as ItemRecibo[]) {
    const valor = formatarReais(item.valor_centavos);
    const desc = quebrar(item.descricao, normal, 11, util - 110);
    desc.forEach((l, i) => pagina.drawText(l, { x: MARGEM + 12, y: y - i * 15, size: 11, font: normal }));
    pagina.drawText(valor, {
      x: LARGURA - MARGEM - normal.widthOfTextAtSize(valor, 11),
      y,
      size: 11,
      font: normal,
    });
    y -= desc.length * 15 + 3;
  }
  pagina.drawLine({ start: { x: MARGEM + 12, y: y + 8 }, end: { x: LARGURA - MARGEM, y: y + 8 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
  const total = formatarReais(recibo.valor_centavos);
  pagina.drawText("Total", { x: MARGEM + 12, y: y - 8, size: 11, font: negrito });
  pagina.drawText(total, { x: LARGURA - MARGEM - negrito.widthOfTextAtSize(total, 11), y: y - 8, size: 11, font: negrito });
  y -= 40;

  escrever(paragrafos[2]);
  escrever("Sendo expressão de verdade e sem qualquer coação, firmo o presente.");

  const quando = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(dataDoRecibo(recibo));
  escrever(`${ctx.processo.cidade}, ${quando}.`);

  y -= 50;
  pagina.drawLine({ start: { x: MARGEM + 60, y }, end: { x: LARGURA - MARGEM - 60, y }, thickness: 0.8 });
  const nomeMae = (mae?.nome ?? "").toUpperCase();
  pagina.drawText(nomeMae, {
    x: (LARGURA - normal.widthOfTextAtSize(nomeMae, 11)) / 2,
    y: y - 16,
    size: 11,
    font: normal,
  });

  if (recibo.confirmado_em) {
    const aceite =
      `Aceite eletrônico no app em ${new Date(recibo.confirmado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` +
      ` · código de verificação ${recibo.codigo}`;
    pagina.drawText(aceite, { x: MARGEM, y: MARGEM - 20, size: 9, font: normal, color: rgb(0.35, 0.35, 0.35) });
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-${tipo}-${competencia}.pdf"`,
    },
  });
}

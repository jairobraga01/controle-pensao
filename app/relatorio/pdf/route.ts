import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { type NextRequest } from "next/server";
import { formatarReais, nomeDoMes } from "@/lib/calculo";
import { carregarContexto, carregarExtrato, membroPorPapel } from "@/lib/dados";
import { lerMes } from "@/lib/mes";
import { montarRelatorio, type ReciboResumo } from "@/lib/relatorio";

const LARGURA = 595.28;
const ALTURA = 841.89;
const M = 40;

const dataBR = (iso: string) => iso.split("-").reverse().join("/");
const mesCurto = (c: string) => `${c.slice(5, 7)}/${c.slice(0, 4)}`;

class Escritor {
  pagina!: PDFPage;
  y = 0;
  constructor(private pdf: PDFDocument, private normal: PDFFont, private negrito: PDFFont) {
    this.novaPagina();
  }
  novaPagina() {
    this.pagina = this.pdf.addPage([LARGURA, ALTURA]);
    this.y = ALTURA - M;
  }
  espaco(h: number) {
    if (this.y - h < M) this.novaPagina();
  }
  texto(t: string, { tamanho = 10, negrito = false, recuo = 0 } = {}) {
    const fonte = negrito ? this.negrito : this.normal;
    const largura = LARGURA - 2 * M - recuo;
    let linha = "";
    const linhas: string[] = [];
    for (const p of t.split(/\s+/)) {
      const tentativa = linha ? `${linha} ${p}` : p;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && linha) {
        linhas.push(linha);
        linha = p;
      } else linha = tentativa;
    }
    if (linha) linhas.push(linha);
    for (const l of linhas) {
      this.espaco(tamanho + 4);
      this.pagina.drawText(l, { x: M + recuo, y: this.y - tamanho, size: tamanho, font: fonte });
      this.y -= tamanho + 4;
    }
  }
  /** Tabela simples; colunas com largura fixa, números alinhados à direita. */
  tabela(cab: string[], larguras: number[], linhas: string[][], direita: boolean[], tamanho = 8) {
    const desenhar = (cols: string[], fonte: PDFFont) => {
      this.espaco(tamanho + 6);
      let x = M;
      cols.forEach((c, i) => {
        let t = c;
        while (t && fonte.widthOfTextAtSize(t, tamanho) > larguras[i] - 4) t = t.slice(0, -2) + "…";
        const w = fonte.widthOfTextAtSize(t, tamanho);
        this.pagina.drawText(t, { x: direita[i] ? x + larguras[i] - 4 - w : x, y: this.y - tamanho, size: tamanho, font: fonte });
        x += larguras[i];
      });
      this.y -= tamanho + 6;
    };
    desenhar(cab, this.negrito);
    this.pagina.drawLine({ start: { x: M, y: this.y + 2 }, end: { x: LARGURA - M, y: this.y + 2 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    for (const l of linhas) {
      if (this.y - (tamanho + 6) < M) {
        this.novaPagina();
        desenhar(cab, this.negrito);
      }
      desenhar(l, this.normal);
    }
  }
}

export async function GET(req: NextRequest) {
  const de = lerMes(req.nextUrl.searchParams.get("de") ?? "");
  const ate = lerMes(req.nextUrl.searchParams.get("ate") ?? "");
  if (!de || !ate || de > ate) {
    return new Response("Período inválido", { status: 400 });
  }
  const ctx = await carregarContexto();
  const { meses, despesas, pagamentos } = await carregarExtrato(ctx);
  const { data: recibos } = await ctx.supabase
    .from("recibos")
    .select("competencia, tipo, valor_centavos, confirmado_em, codigo")
    .eq("processo_id", ctx.processo.id)
    .gte("competencia", de)
    .lte("competencia", ate);
  const r = montarRelatorio(
    meses.filter((m) => m.competencia >= de && m.competencia <= ate),
    (recibos ?? []) as ReciboResumo[],
    despesas,
    pagamentos,
  );

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Relatório de pensão ${de} a ${ate}`);
  const e = new Escritor(
    pdf,
    await pdf.embedFont(StandardFonts.Helvetica),
    await pdf.embedFont(StandardFonts.HelveticaBold),
  );
  const pai = membroPorPapel(ctx, "pagador");
  const mae = membroPorPapel(ctx, "recebedora");

  e.texto("RELATÓRIO DE PAGAMENTO DE PENSÃO ALIMENTÍCIA", { tamanho: 13, negrito: true });
  e.y -= 6;
  e.texto(`Processo nº ${ctx.processo.numero} · ${ctx.processo.vara}`);
  e.texto(`Alimentando(a): ${ctx.processo.alimentando_nome}`);
  e.texto(`Alimentante: ${pai?.nome ?? "-"} · Representante: ${mae?.nome ?? "-"}`);
  e.texto(`Período: ${nomeDoMes(de)} a ${nomeDoMes(ate)} · gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  e.y -= 10;

  e.texto("Resumo mensal", { tamanho: 11, negrito: true });
  e.y -= 2;
  e.tabela(
    ["Mês", "Pensão", "Recibo judicial", "Recibo extra", "Pago", "Saldo", "Recibos"],
    [44, 62, 72, 64, 64, 60, 149],
    [
      ...r.linhas.map((l) => [
        mesCurto(l.competencia), formatarReais(l.pensao), formatarReais(l.judicial), formatarReais(l.extra),
        formatarReais(l.pago), formatarReais(l.saldo), l.recibos,
      ]),
      ["Total", formatarReais(r.totais.pensao), formatarReais(r.totais.judicial), formatarReais(r.totais.extra),
        formatarReais(r.totais.pago), formatarReais(r.totais.saldo), ""],
    ],
    [false, true, true, true, true, true, false],
  );
  e.y -= 8;
  e.texto(
    "Recibo judicial: pensão (percentual do salário mínimo vigente) mais o saldo das despesas médicas e escolares, " +
      "divididas em 50% para cada genitor. Recibo extra: despesas combinadas entre as partes, fora da decisão. " +
      "Saldo positivo indica valor ainda não pago.",
    { tamanho: 8 },
  );
  e.y -= 12;

  e.texto("Despesas do recibo judicial", { tamanho: 11, negrito: true });
  e.y -= 2;
  e.tabela(
    ["Mês", "Data", "Descrição", "Valor", "Efeito", "Comprovante"],
    [44, 56, 175, 70, 70, 100],
    r.despesasJudiciais.map((d) => [
      mesCurto(d.competencia), dataBR(d.data), d.descricao, formatarReais(d.valor), formatarReais(d.efeito), d.comprovante,
    ]),
    [false, false, false, true, true, false],
  );
  e.y -= 12;

  e.texto("Pagamentos", { tamanho: 11, negrito: true });
  e.y -= 2;
  e.tabela(
    ["Mês", "Data", "Valor", "Forma", "Comprovante"],
    [44, 66, 90, 100, 215],
    r.pagamentos.map((p) => [mesCurto(p.competencia), dataBR(p.data), formatarReais(p.valor), p.forma, p.comprovante]),
    [false, false, true, false, false],
  );

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-pensao-${de}-a-${ate}.pdf"`,
    },
  });
}

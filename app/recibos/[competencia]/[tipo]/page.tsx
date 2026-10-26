import { BotaoEnviar } from "@/components/BotaoEnviar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Menu } from "@/components/Menu";
import { formatarReais, nomeDoMes } from "@/lib/calculo";
import { linksDosComprovantes } from "@/lib/comprovantes";
import { carregarContexto, membroPorPapel } from "@/lib/dados";
import { TITULO_RECIBO, ehTipoRecibo, textoDoRecibo, type ItemRecibo } from "@/lib/recibo";
import { anexarAssinado, confirmar } from "./actions";

function dataPorExtenso(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function Recibo({
  params,
  searchParams,
}: {
  params: Promise<{ competencia: string; tipo: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { competencia, tipo } = await params;
  const { erro } = await searchParams;
  if (!ehTipoRecibo(tipo)) notFound();
  const ctx = await carregarContexto();
  const { data: doMes } = await ctx.supabase
    .from("recibos")
    .select("*")
    .eq("processo_id", ctx.processo.id)
    .eq("competencia", competencia);
  const recibo = doMes?.find((r) => r.tipo === tipo);
  const outro = doMes?.find((r) => r.tipo !== tipo);
  if (!recibo) notFound();

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
  const itens = recibo.itens as ItemRecibo[];
  const assinados = await linksDosComprovantes(ctx, { coluna: "recibo_id", id: recibo.id });
  const base = `/recibos/${competencia}/${tipo}`;

  return (
    <div className="app">
      <header className="topo">
        <div>
          <small style={{ textTransform: "capitalize" }}>{nomeDoMes(competencia)}</small>
          <h1>{tipo === "judicial" ? "Recibo judicial" : "Recibo extra"}</h1>
        </div>
      </header>
      <main className="conteudo">
        {outro && (
          <Link href={`/recibos/${competencia}/${outro.tipo}`} className="botao contorno">
            Ver {outro.tipo === "judicial" ? "recibo judicial" : "recibo extra"} do mês ({formatarReais(outro.valor_centavos)})
          </Link>
        )}

        {recibo.confirmado_em ? (
          <div className="ok">
            Confirmado pela mãe em {new Date(recibo.confirmado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · código {recibo.codigo}
          </div>
        ) : (
          <div className="alerta">Aguardando confirmação da mãe.</div>
        )}

        <article className="recibo">
          <h2>{TITULO_RECIBO[tipo]}</h2>
          <p>{paragrafos[0]}</p>
          <p>{paragrafos[1]}</p>
          <div className="itens">
            {itens.map((i, n) => (
              <div className="linha" key={n} style={{ fontSize: 13 }}>
                <span>{i.descricao}</span>
                <span className="num">{formatarReais(i.valor_centavos)}</span>
              </div>
            ))}
          </div>
          <p>{paragrafos[2]}</p>
          {recibo.confirmado_em && <p>{ctx.processo.cidade}, {dataPorExtenso(recibo.confirmado_em)}.</p>}
        </article>

        {ctx.eu.papel === "recebedora" && !recibo.confirmado_em && (
          <form action={confirmar}>
            <input type="hidden" name="id" value={recibo.id} />
            <input type="hidden" name="volta" value={base} />
            <BotaoEnviar>Confirmar recebimento</BotaoEnviar>
          </form>
        )}

        <a className="botao contorno" href={`${base}/pdf`}>Baixar PDF para assinar no gov.br</a>

        <section className="cartao">
          <h2>PDF assinado</h2>
          {assinados.length === 0 && <p className="dica">Nenhum PDF assinado anexado ainda.</p>}
          <ul className="lista">
            {assinados.map((a) => (
              <li key={a.id}>{a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.nome_arquivo}</a> : a.nome_arquivo}</li>
            ))}
          </ul>
          {ctx.eu.papel !== "advogado" && (
            <form action={anexarAssinado}>
              <input type="hidden" name="id" value={recibo.id} />
              <input type="hidden" name="volta" value={base} />
              <label>Anexar PDF assinado<input name="comprovante" type="file" accept="application/pdf" required /></label>
              {erro && <p className="erro">{erro}</p>}
              <button className="botao contorno" type="submit">Anexar</button>
            </form>
          )}
        </section>
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Menu } from "@/components/Menu";
import { efeitoNoDevido, formatarReais, nomeDoMes } from "@/lib/calculo";
import { linksDosComprovantes } from "@/lib/comprovantes";
import { carregarContexto, carregarLancamentos, membroPorPapel, paraDespesa } from "@/lib/dados";
import { textoDoRecibo, type ItemRecibo } from "@/lib/recibo";
import { anexarAssinado, confirmar } from "./actions";

function dataPorExtenso(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function Recibo({
  params,
  searchParams,
}: {
  params: Promise<{ competencia: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { competencia } = await params;
  const { erro } = await searchParams;
  const ctx = await carregarContexto();
  const { data: recibo } = await ctx.supabase
    .from("recibos")
    .select("*")
    .eq("processo_id", ctx.processo.id)
    .eq("competencia", competencia)
    .maybeSingle();
  if (!recibo) notFound();

  const mae = membroPorPapel(ctx, "recebedora");
  const pai = membroPorPapel(ctx, "pagador");
  const paragrafos = textoDoRecibo({
    recebedora: mae ?? { nome: "[nome da mãe]", qualificacao: null, cpf: null, rg: null, endereco: null },
    pagador: pai ?? { nome: "[nome do pai]", cpf: null, rg: null },
    alimentando: ctx.processo.alimentando_nome,
    competencia,
    valor: recibo.valor_centavos,
    processo: ctx.processo,
  });
  const itens = recibo.itens as ItemRecibo[];
  const { despesas } = await carregarLancamentos(ctx, competencia);
  const combinadas = despesas.filter((d) => d.categoria === "combinada" && !d.contestada_em);
  const assinados = await linksDosComprovantes(ctx, { coluna: "recibo_id", id: recibo.id });

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1 style={{ textTransform: "capitalize" }}>Recibo de {nomeDoMes(competencia)}</h1>
        </div>
      </header>
      <main className="conteudo">
        {recibo.confirmado_em ? (
          <div className="ok">
            Confirmado pela mãe em {new Date(recibo.confirmado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · código {recibo.codigo}
          </div>
        ) : (
          <div className="alerta">Aguardando confirmação da mãe.</div>
        )}

        <article className="recibo">
          <h2>RECIBO DE PAGAMENTO DE PENSÃO ALIMENTÍCIA</h2>
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
            <input type="hidden" name="competencia" value={competencia} />
            <button className="botao" type="submit">Confirmar recebimento</button>
          </form>
        )}

        <a className="botao contorno" href={`/recibos/${competencia}/pdf`}>Baixar PDF para assinar no gov.br</a>

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
              <input type="hidden" name="competencia" value={competencia} />
              <label>Anexar PDF assinado<input name="comprovante" type="file" accept="application/pdf" required /></label>
              {erro && <p className="erro">{erro}</p>}
              <button className="botao contorno" type="submit">Anexar</button>
            </form>
          )}
        </section>

        <section className="cartao">
          <h2>Demonstrativo das despesas combinadas</h2>
          <p className="dica">Fora do recibo judicial.</p>
          {combinadas.length === 0 && <p className="dica">Nenhuma neste mês.</p>}
          <ul className="lista">
            {combinadas.map((d) => (
              <li key={d.id}>
                <Link href={`/despesas/${d.id}`}>{d.descricao}</Link>
                <span className="num">{formatarReais(efeitoNoDevido(paraDespesa(d)))}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

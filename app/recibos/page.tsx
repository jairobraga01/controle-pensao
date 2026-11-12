import Link from "next/link";
import { Menu } from "@/components/Menu";
import { formatarReais, nomeDoMes } from "@/lib/calculo";
import { carregarContexto } from "@/lib/dados";

type Recibo = { id: string; competencia: string; tipo: string; valor_centavos: number; confirmado_em: string | null };

/** Um recibo dentro da sua coluna; mês sem recibo daquele tipo fica com um traço. */
function Celula({ r }: { r?: Recibo }) {
  if (!r) return <div className="rec-celula vazia">—</div>;
  return (
    <Link href={`/recibos/${r.competencia}/${r.tipo}`} className="rec-celula">
      <span className="num">{formatarReais(r.valor_centavos)}</span>
      <span className={`selo ${r.confirmado_em ? "quitado" : "atrasado"}`}>
        {r.confirmado_em ? "Confirmado" : "Aguardando mãe"}
      </span>
    </Link>
  );
}

export default async function Recibos() {
  const ctx = await carregarContexto();
  const { data } = await ctx.supabase
    .from("recibos")
    .select("id, competencia, tipo, valor_centavos, confirmado_em")
    .eq("processo_id", ctx.processo.id)
    .order("competencia", { ascending: false });
  const recibos = (data ?? []) as Recibo[];

  // Uma linha por mês, com o recibo judicial à esquerda e o extra à direita.
  const meses = [...new Set(recibos.map((r) => r.competencia))];
  const achar = (c: string, tipo: string) => recibos.find((r) => r.competencia === c && r.tipo === tipo);

  return (
    <div className="app">
      <header className="topo"><h1>Recibos</h1></header>
      <main className="conteudo">
        <section className="cartao">
          {recibos.length === 0 && <p className="dica">Os recibos aparecem aqui quando um pagamento é registrado.</p>}
          {meses.length > 0 && (
            <div className="rec-grade">
              <div className="rec-titulo">Recibo judicial</div>
              <div className="rec-titulo">Recibo extra</div>
              {meses.map((c) => (
                <div key={c} className="rec-mes">
                  <div className="rec-nome">{nomeDoMes(c)}</div>
                  <Celula r={achar(c, "judicial")} />
                  <Celula r={achar(c, "extra")} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

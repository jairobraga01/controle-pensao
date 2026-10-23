import Link from "next/link";
import { Menu } from "@/components/Menu";
import { formatarReais, nomeDoMes } from "@/lib/calculo";
import { carregarContexto } from "@/lib/dados";

export default async function Recibos() {
  const ctx = await carregarContexto();
  const { data } = await ctx.supabase
    .from("recibos")
    .select("id, competencia, valor_centavos, confirmado_em")
    .eq("processo_id", ctx.processo.id)
    .order("competencia", { ascending: false });
  const recibos = data ?? [];

  return (
    <div className="app">
      <header className="topo"><h1>Recibos</h1></header>
      <main className="conteudo">
        <section className="cartao">
          {recibos.length === 0 && <p className="dica">Os recibos aparecem aqui quando um pagamento é registrado.</p>}
          <ul className="lista">
            {recibos.map((r) => (
              <li key={r.id}>
                <Link href={`/recibos/${r.competencia}`} style={{ textTransform: "capitalize" }}>
                  {nomeDoMes(r.competencia)}
                </Link>
                <span style={{ textAlign: "right" }}>
                  <span className="num">{formatarReais(r.valor_centavos)}</span>
                  <br />
                  <span className={`selo ${r.confirmado_em ? "quitado" : "atrasado"}`}>
                    {r.confirmado_em ? "Confirmado" : "Aguardando mãe"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

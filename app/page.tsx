import Link from "next/link";
import { Menu } from "@/components/Menu";
import { formatarReais, nomeDoMes, statusDoMes } from "@/lib/calculo";
import { carregarContexto, carregarExtrato, competenciaAtual, hojeISO } from "@/lib/dados";
import { sair } from "./login/actions";

const ROTULO = { quitado: "Quitado", aberto: "Aberto", atrasado: "Em atraso" } as const;

export default async function Painel() {
  const ctx = await carregarContexto();
  const { meses, despesas } = await carregarExtrato(ctx);
  const atual = competenciaAtual();
  const mes = meses.find((m) => m.competencia === atual) ?? meses[0];
  const status = statusDoMes(mes, hojeISO());
  const anteriores = meses.filter((m) => m.competencia < mes.competencia && m.saldo > 0);
  const devedorAnterior = anteriores.reduce((s, m) => s + m.saldo, 0);
  const contestadas = despesas.filter((d) => d.contestada_em);
  const ultimas = despesas.slice(0, 5);
  const podeLancar = ctx.eu.papel !== "advogado";

  return (
    <div className="app">
      <header className="topo" style={{ justifyContent: "space-between" }}>
        <div>
          <small>Olá, {ctx.eu.nome.split(" ")[0]}</small>
          <h1 style={{ textTransform: "capitalize" }}>{nomeDoMes(mes.competencia)}</h1>
        </div>
        <form action={sair}>
          <button className="botao contorno" style={{ padding: "8px 12px", fontSize: 13 }}>Sair</button>
        </form>
      </header>
      <main className="conteudo">
        <section className="destaque">
          <span style={{ fontSize: 13 }}>{mes.saldo > 0 ? "Falta transferir no mês" : "Mês quitado"}</span>
          <span className="valor num">{formatarReais(Math.max(mes.saldo, 0))}</span>
          <span style={{ fontSize: 13 }}>
            <span className={`selo ${status}`}>{ROTULO[status]}</span> vence em{" "}
            {mes.vencimento.split("-").reverse().join("/")}
          </span>
          {ctx.eu.papel === "pagador" && mes.saldo > 0 && (
            <Link className="botao claro" href={`/pagamento?mes=${mes.competencia}`}>Registrar pagamento</Link>
          )}
        </section>

        <section className="cartao">
          <h2>Composição do mês</h2>
          <div className="linha"><span>Pensão ({mes.percentualPensao}% de {formatarReais(mes.salarioMinimo)})</span><span className="num">{formatarReais(mes.pensao)}</span></div>
          <div className="linha"><span>Despesas da decisão (saldo)</span><span className="num">{formatarReais(mes.despesasDecisao)}</span></div>
          <div className="linha"><span>Despesas combinadas</span><span className="num">{formatarReais(mes.despesasCombinadas)}</span></div>
          <div className="linha"><span>Já pago</span><span className="num">{formatarReais(mes.pago)}</span></div>
          <div className="divisor" />
          <div className="linha suave"><span>Vai no recibo judicial</span><span className="num">{formatarReais(mes.totalRecibo)}</span></div>
          <div className="linha suave"><span>Vai no demonstrativo</span><span className="num">{formatarReais(mes.totalDemonstrativo)}</span></div>
        </section>

        {devedorAnterior > 0 && (
          <Link href="/extrato?filtro=abertos" className="alerta" style={{ textDecoration: "none" }}>
            <strong>Saldo de meses anteriores: {formatarReais(devedorAnterior)}</strong>
            <br />
            {anteriores.length} {anteriores.length === 1 ? "mês" : "meses"} com valor em aberto.
          </Link>
        )}
        {contestadas.length > 0 && (
          <div className="alerta">
            {contestadas.length} despesa(s) contestada(s), fora do cálculo até vocês resolverem.
          </div>
        )}

        <section className="cartao">
          <div className="linha"><h2>Últimos lançamentos</h2><Link href="/extrato" style={{ fontSize: 13, fontWeight: 600 }}>Ver extrato</Link></div>
          {ultimas.length === 0 ? (
            <p className="dica">Nenhuma despesa lançada ainda.</p>
          ) : (
            <ul className="lista">
              {ultimas.map((d) => (
                <li key={d.id}>
                  <Link href={`/despesas/${d.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {d.descricao}
                    <small>
                      {d.paga_por === "pagador" ? "Pago pelo pai" : "Pago pela mãe"} ·{" "}
                      {d.categoria === "decisao" ? "decisão" : "combinada"}
                      {d.contestada_em ? " · contestada" : ""}
                    </small>
                  </Link>
                  <span className="num">{formatarReais(d.valor_centavos)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Menu podeLancar={podeLancar} />
    </div>
  );
}

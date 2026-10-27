import Link from "next/link";
import { Menu } from "@/components/Menu";
import { formatarReais, nomeDoMes, saldoAcumulado, statusDoMes, type StatusMes } from "@/lib/calculo";
import { carregarContexto, carregarExtrato, hojeISO } from "@/lib/dados";
import { blocosDoMes } from "@/lib/planilha";

const ROTULO: Record<StatusMes, string> = { quitado: "Quitado", aberto: "Aberto", atrasado: "Em atraso" };
const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "abertos", rotulo: "Em aberto" },
  { id: "quitados", rotulo: "Pagos" },
];

export default async function Extrato({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro = "todos" } = await searchParams;
  const ctx = await carregarContexto();
  const { meses, despesas } = await carregarExtrato(ctx);
  const pendentes = blocosDoMes("", despesas).find((b) => b.chave === "pendentes")!;
  const hoje = hojeISO();
  const comStatus = meses.map((m) => ({ ...m, status: statusDoMes(m, hoje) }));
  const visiveis = comStatus.filter((m) =>
    filtro === "abertos" ? m.status !== "quitado" : filtro === "quitados" ? m.status === "quitado" : true,
  );
  const devedor = saldoAcumulado(meses.filter((m) => m.saldo > 0 && m.vencimento < hoje));
  const anoAtual = hoje.slice(0, 4);
  const pagoNoAno = meses.filter((m) => m.competencia.startsWith(anoAtual)).reduce((s, m) => s + m.pago, 0);

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Extrato</h1>
          <small>Desde {nomeDoMes(ctx.processo.inicio_competencia)}</small>
        </div>
      </header>
      <main className="conteudo">
        <section className="grade2">
          <div className="cartao">
            <small className="dica">Saldo devedor vencido</small>
            <strong className="num" style={{ fontSize: 20, color: devedor > 0 ? "var(--alerta-texto)" : undefined }}>
              {formatarReais(devedor)}
            </strong>
          </div>
          <div className="cartao">
            <small className="dica">Pago em {anoAtual}</small>
            <strong className="num" style={{ fontSize: 20 }}>{formatarReais(pagoNoAno)}</strong>
          </div>
        </section>

        <nav aria-label="Filtro" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTROS.map((f) => (
            <Link key={f.id} href={`/extrato?filtro=${f.id}`}
              className={`botao ${filtro === f.id ? "" : "contorno"}`}
              style={{ width: "auto", padding: "10px 16px", fontSize: 13 }}
              aria-current={filtro === f.id ? "page" : undefined}>
              {f.rotulo}
            </Link>
          ))}
        </nav>

        <section className="cartao">
          <ul className="lista">
            {filtro !== "quitados" && pendentes.itens.length > 0 && (
              <li>
                <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
                  <span style={{ fontWeight: 600 }}>Outras despesas pendentes</span>
                  <small>{pendentes.itens.length} {pendentes.itens.length === 1 ? "despesa" : "despesas"} fora do cálculo</small>
                </Link>
                <span style={{ textAlign: "right" }}>
                  <span className="num">{formatarReais(pendentes.totalValor)}</span>
                  <br />
                  <span className="selo atrasado">Pendente</span>
                </span>
              </li>
            )}
            {visiveis.map((m) => (
              <li key={m.competencia}>
                <span>
                  <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{nomeDoMes(m.competencia)}</span>
                  <small>
                    recibo {formatarReais(m.totalRecibo)} + extra {formatarReais(m.totalDemonstrativo)}
                    {m.pago > 0 && ` · pago ${formatarReais(m.pago)}`}
                  </small>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span className="num">{formatarReais(m.total)}</span>
                  <br />
                  <span className={`selo ${m.status}`}>{ROTULO[m.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <Link href="/relatorio" className="botao contorno">Relatório para a justiça (PDF)</Link>
        {ctx.eu.papel === "pagador" && (
          <Link href="/importar" className="botao contorno">Importar planilha</Link>
        )}
        {ctx.eu.papel !== "advogado" && (
          <Link href="/convidar" className="botao contorno">Convidar a outra parte ou o advogado</Link>
        )}
        <Link href="/perfil" className="botao contorno">Meus dados para o recibo</Link>
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

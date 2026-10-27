import Link from "next/link";
import { FormDespesa } from "@/components/FormDespesa";
import { Menu } from "@/components/Menu";
import { SeletorMes } from "@/components/SeletorMes";
import { formatarReais, statusDoMes, type Parte } from "@/lib/calculo";
import {
  carregarContexto,
  carregarExtrato,
  carregarTipos,
  competenciaAtual,
  hojeISO,
  membroPorPapel,
} from "@/lib/dados";
import { mesParaTela } from "@/lib/mes";
import { blocosDoMes, type Bloco } from "@/lib/planilha";
import { rotuloDoTipo } from "@/lib/tipos";
import { incluirPendente } from "./actions";
import { sair } from "./login/actions";

const ROTULO = { quitado: "Quitado", aberto: "Aberto", atrasado: "Em atraso" } as const;

function dataCurta(iso: string): string {
  return iso.split("-").reverse().join("-");
}

export default async function Painel({ searchParams }: { searchParams: Promise<{ mes?: string; erro?: string }> }) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const [{ meses, despesas }, todosTipos] = await Promise.all([carregarExtrato(ctx), carregarTipos(ctx)]);
  const lista = meses.map((m) => m.competencia);
  const escolhido = lista.includes(sp.mes ?? "") ? sp.mes! : competenciaAtual();
  const mes = meses.find((m) => m.competencia === escolhido) ?? meses[0];
  const status = statusDoMes(mes, hojeISO());
  const anteriores = meses.filter((m) => m.competencia < mes.competencia && m.saldo > 0);
  const devedorAnterior = anteriores.reduce((s, m) => s + m.saldo, 0);
  const contestadas = despesas.filter((d) => d.contestada_em && d.competencia === mes.competencia);
  const podeLancar = ctx.eu.papel !== "advogado";
  const tipos = todosTipos.filter((t) => t.ativo);
  const ultimas = despesas.slice(0, 5);
  const voltar = `/?mes=${mes.competencia}`;
  const hoje = hojeISO();

  const primeiro = (p: Parte, padrao: string) => membroPorPapel(ctx, p)?.nome.split(" ")[0] || padrao;
  const nomes: Record<Parte, string> = { recebedora: primeiro("recebedora", "Mãe"), pagador: primeiro("pagador", "Pai") };
  const blocos = Object.fromEntries(blocosDoMes(mes.competencia, despesas).map((b) => [b.chave, b])) as Record<Bloco["chave"], Bloco>;
  const pendentes = blocos.pendentes;

  // Um bloco da planilha (aba 10-2026), aberto dentro da Composição do mês.
  function TabelaBloco({ bloco, titulo }: { bloco: Bloco; titulo: string }) {
    const tiposDoBloco = bloco.categoria ? tipos.filter((t) => t.categoria === bloco.categoria) : tipos;
    const ehPendente = bloco.chave === "pendentes";
    return (
      <div className="planilha">
        <div className="pl-linha pl-cab">
          <span>{titulo}</span>
          <span>Valor</span>
          <span>Valor/2</span>
        </div>
        {bloco.itens.map((i) => (
          <div key={i.id}>
            <Link href={`/despesas/${i.id}`} className="pl-linha">
              <span>{dataCurta(i.data)} - {i.descricao}</span>
              <span className="num">{formatarReais(i.valor)}</span>
              <span className={`num${i.parte < 0 ? " negativo" : ""}`}>{formatarReais(i.parte)}</span>
            </Link>
            {ehPendente && podeLancar && (
              <form action={incluirPendente} className="pl-acao">
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="mes" value={mes.competencia} />
                <button className="link">Incluir no cálculo de {mesParaTela(mes.competencia)}</button>
              </form>
            )}
          </div>
        ))}
        {bloco.itens.length === 0 && <p className="dica pl-vazio">Nenhuma despesa.</p>}
        <div className="pl-linha pl-total">
          <span>Total</span>
          <span className="num">{formatarReais(bloco.totalValor)}</span>
          <span className={`num${bloco.totalParte < 0 ? " negativo" : ""}`}>{formatarReais(bloco.totalParte)}</span>
        </div>
        {podeLancar && tiposDoBloco.length > 0 && (
          <details className="incluir">
            <summary>+ Incluir despesa</summary>
            <FormDespesa
              tipos={tiposDoBloco}
              pagaPor={bloco.pagaPor}
              competencia={mes.competencia}
              pendente={ehPendente}
              voltar={voltar}
              hoje={hoje}
              nomes={nomes}
            />
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topo" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <small>Olá, {ctx.eu.nome.split(" ")[0]}</small>
          <SeletorMes meses={lista} atual={mes.competencia} />
        </div>
        <form action={sair}>
          <button className="botao contorno" style={{ padding: "8px 12px", fontSize: 13 }}>Sair</button>
        </form>
      </header>
      <main className="conteudo">
        {sp.erro && <div className="alerta">{sp.erro}</div>}

        <section className="destaque">
          <span style={{ fontSize: 13 }}>{mes.saldo > 0 ? "Falta transferir no mês" : "Mês quitado"}</span>
          <span className="valor num">{formatarReais(Math.max(mes.saldo, 0))}</span>
          <span style={{ fontSize: 13 }}>
            <span className={`selo ${status}`}>{ROTULO[status]}</span> vence em {dataCurta(mes.vencimento).replace(/-/g, "/")}
          </span>
          {ctx.eu.papel === "pagador" && mes.saldo > 0 && (
            <Link className="botao claro" href={`/pagamento?mes=${mes.competencia}`}>Registrar pagamento</Link>
          )}
        </section>

        <section className="cartao composicao">
          <h2>Composição do mês</h2>
          <div className="linha"><span>Pensão ({mes.percentualPensao}% de {formatarReais(mes.salarioMinimo)})</span><span className="num">{formatarReais(mes.pensao)}</span></div>
          <details>
            <summary className="linha"><span>Despesas da decisão (saldo 50%)</span><span className="num">{formatarReais(mes.despesasDecisao)}</span></summary>
            <TabelaBloco bloco={blocos.decisao_recebedora} titulo={`Despesas Decisão - ${nomes.recebedora}`} />
            <TabelaBloco bloco={blocos.decisao_pagador} titulo={`Despesas Decisão - ${nomes.pagador}`} />
          </details>
          <details>
            <summary className="linha"><span>Despesas combinadas</span><span className="num">{formatarReais(mes.despesasCombinadas)}</span></summary>
            <TabelaBloco bloco={blocos.combinada_recebedora} titulo={`Despesas Extras - ${nomes.recebedora}`} />
            <TabelaBloco bloco={blocos.combinada_pagador} titulo={`Despesas Extras - ${nomes.pagador}`} />
          </details>
          {mes.pago > 0 && <div className="linha"><span>Já pago</span><span className="num">{formatarReais(mes.pago)}</span></div>}
          <div className="divisor" />
          <div className="linha suave"><span>Vai no recibo judicial</span><span className="num">{formatarReais(mes.totalRecibo)}</span></div>
          <div className="linha suave"><span>Vai no recibo extra</span><span className="num">{formatarReais(mes.totalDemonstrativo)}</span></div>
          <p className="dica">Toque nas despesas para ver o detalhe no modelo da planilha e incluir novas.</p>
        </section>

        {pendentes.itens.length > 0 ? (
          <details className="alerta pendencia">
            <summary>
              <strong>Pendência: outras despesas</strong>
              <br />
              {formatarReais(pendentes.totalValor)} em {pendentes.itens.length}{" "}
              {pendentes.itens.length === 1 ? "despesa" : "despesas"}. Ainda não entram no cálculo.
            </summary>
            <TabelaBloco bloco={pendentes} titulo="Outras Despesas Pendentes" />
          </details>
        ) : (
          podeLancar && (
            <details className="cartao pendencia">
              <summary className="dica">+ Registrar despesa pendente (fica fora do cálculo)</summary>
              <TabelaBloco bloco={pendentes} titulo="Outras Despesas Pendentes" />
            </details>
          )
        )}

        {devedorAnterior > 0 && (
          <Link href="/extrato?filtro=abertos" className="alerta" style={{ textDecoration: "none" }}>
            <strong>Saldo de meses anteriores: {formatarReais(devedorAnterior)}</strong>
            <br />
            {anteriores.length} {anteriores.length === 1 ? "mês" : "meses"} com valor em aberto.
          </Link>
        )}
        {contestadas.length > 0 && (
          <div className="alerta">
            {contestadas.length} despesa(s) contestada(s) neste mês, fora do cálculo até vocês resolverem.
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
                      {nomes[d.paga_por]} · {rotuloDoTipo(todosTipos, d.tipo)}
                      {d.pendente ? " · pendente" : ""}
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

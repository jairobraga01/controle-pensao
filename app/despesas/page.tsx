import { BlocoPlanilha } from "@/components/BlocoPlanilha";
import { Menu } from "@/components/Menu";
import { SeletorMes } from "@/components/SeletorMes";
import { formatarReais, type Parte } from "@/lib/calculo";
import {
  carregarContexto,
  carregarExtrato,
  carregarTipos,
  competenciaAtual,
  hojeISO,
  membroPorPapel,
} from "@/lib/dados";
import { blocosDoMes, type Bloco } from "@/lib/planilha";

/** Discriminação das Despesas: a aba do mês da planilha (modelo oficial 10-2026). */
export default async function Discriminacao({ searchParams }: { searchParams: Promise<{ mes?: string; erro?: string }> }) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const [{ meses, despesas }, todosTipos] = await Promise.all([carregarExtrato(ctx), carregarTipos(ctx)]);
  const lista = meses.map((m) => m.competencia);
  const escolhido = lista.includes(sp.mes ?? "") ? sp.mes! : competenciaAtual();
  const mes = meses.find((m) => m.competencia === escolhido) ?? meses[0];
  const podeLancar = ctx.eu.papel !== "advogado";

  const primeiro = (p: Parte, padrao: string) => membroPorPapel(ctx, p)?.nome.split(" ")[0] || padrao;
  const nomes: Record<Parte, string> = { recebedora: primeiro("recebedora", "Mãe"), pagador: primeiro("pagador", "Pai") };
  const b = Object.fromEntries(blocosDoMes(mes.competencia, despesas).map((x) => [x.chave, x])) as Record<Bloco["chave"], Bloco>;
  const comum = {
    competencia: mes.competencia,
    tipos: todosTipos.filter((t) => t.ativo),
    podeLancar,
    voltar: `/despesas?mes=${mes.competencia}`,
    hoje: hojeISO(),
    nomes,
    processoId: ctx.processo.id,
  };

  return (
    <div className="app">
      <header className="topo" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <small>Discriminação das Despesas</small>
          <SeletorMes meses={lista} atual={mes.competencia} base="/despesas" />
        </div>
      </header>
      <main className="conteudo">
        {sp.erro && <div className="alerta">{sp.erro}</div>}

        <BlocoPlanilha {...comum} bloco={b.decisao_recebedora} titulo={`Despesas Decisão - ${nomes.recebedora}`} totalRotulo={`Total ${nomes.recebedora}`} />
        <BlocoPlanilha {...comum} bloco={b.combinada_recebedora} titulo={`Despesas Extras - ${nomes.recebedora}`} totalRotulo={`Total ${nomes.recebedora}`} />
        <BlocoPlanilha {...comum} bloco={b.decisao_pagador} titulo={`Despesas Decisão - ${nomes.pagador}`} totalRotulo={`Total ${nomes.pagador}`} />
        <BlocoPlanilha {...comum} bloco={b.combinada_pagador} titulo={`Despesas Extras - ${nomes.pagador}`} totalRotulo={`Total ${nomes.pagador}`} />

        <section className="cartao planilha resumo">
          <div className="pl-linha"><span>Pensão Alimentícia</span><span className="num">{formatarReais(mes.pensao)}</span></div>
          <div className="pl-linha"><span>Diferença - Valor a transferir - Despesas Decisão</span><span className="num">{formatarReais(mes.despesasDecisao)}</span></div>
          <div className="pl-linha pl-total"><span>Total</span><span className="num">{formatarReais(mes.totalRecibo)}</span></div>
          <div className="pl-linha"><span>Diferença - Valor a transferir - Despesas Extras</span><span className="num">{formatarReais(mes.totalDemonstrativo)}</span></div>
          <div className="pl-linha pl-total"><span>Total Transferido no Mês</span><span className="num">{formatarReais(mes.total)}</span></div>
          {mes.pago > 0 && <div className="pl-linha suave"><span>Já pago no mês</span><span className="num">{formatarReais(mes.pago)}</span></div>}
        </section>

        <BlocoPlanilha {...comum} bloco={b.pendentes} titulo="Outras Despesas Pendentes" totalRotulo="Total" />
        <p className="dica">As pendentes não entram no cálculo nem nos recibos até serem incluídas num mês.</p>
      </main>
      <Menu podeLancar={podeLancar} />
    </div>
  );
}

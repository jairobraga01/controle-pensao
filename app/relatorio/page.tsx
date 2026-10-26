import { Menu } from "@/components/Menu";
import { carregarContexto, competenciaAtual } from "@/lib/dados";

export default async function Relatorio() {
  const ctx = await carregarContexto();
  return (
    <div className="app">
      <header className="topo"><h1>Relatório para a justiça</h1></header>
      <main className="conteudo">
        <form action="/relatorio/pdf" method="get" className="cartao">
          <p className="dica">
            PDF com, mês a mês, a pensão, as despesas do recibo judicial, o recibo extra, os
            pagamentos, o saldo e a situação de cada recibo, seguido da lista de despesas e
            pagamentos com a origem do comprovante.
          </p>
          <div className="grade2">
            <label>De<input name="de" type="month" required defaultValue={ctx.processo.inicio_competencia} /></label>
            <label>Até<input name="ate" type="month" required defaultValue={competenciaAtual()} /></label>
          </div>
          <button className="botao" type="submit">Gerar PDF</button>
        </form>
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

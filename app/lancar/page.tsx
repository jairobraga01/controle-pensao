import { redirect } from "next/navigation";
import { Menu } from "@/components/Menu";
import { TipoDespesa } from "@/components/TipoDespesa";
import { carregarContexto, competenciaAtual, hojeISO } from "@/lib/dados";
import { lancarDespesa } from "./actions";

export default async function Lancar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel === "advogado") redirect("/");

  return (
    <div className="app">
      <header className="topo"><h1>Lançar despesa</h1></header>
      <main className="conteudo">
        <form action={lancarDespesa} className="cartao">
          <label>Descrição<input name="descricao" required placeholder="Ex.: Uniforme escolar" /></label>
          <div className="grade2">
            <label>Valor total (R$)<input name="valor" required inputMode="decimal" placeholder="0,00" /></label>
            <label>Data da compra<input name="data" type="date" required defaultValue={hojeISO()} /></label>
          </div>
          <label>
            Quem pagou
            <select name="paga_por" defaultValue={ctx.eu.papel}>
              <option value="pagador">Pai</option>
              <option value="recebedora">Mãe</option>
            </select>
          </label>
          <TipoDespesa />
          <label>
            Mês em que entra no cálculo
            <input name="competencia" type="month" required defaultValue={competenciaAtual()} />
          </label>
          <label>
            Comprovante (obrigatório)
            <input name="comprovante" type="file" accept="application/pdf,image/*" multiple required />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao" type="submit">Salvar despesa</button>
        </form>
      </main>
      <Menu podeLancar />
    </div>
  );
}

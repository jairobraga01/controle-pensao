import { BotaoEnviar } from "@/components/BotaoEnviar";
import { redirect } from "next/navigation";
import { CampoMes } from "@/components/CampoMes";
import { Menu } from "@/components/Menu";
import { TipoDespesa } from "@/components/TipoDespesa";
import { carregarContexto, carregarTipos, competenciaAtual, hojeISO } from "@/lib/dados";
import { lancarDespesa } from "./actions";

export default async function Lancar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel === "advogado") redirect("/");
  const tipos = (await carregarTipos(ctx)).filter((t) => t.ativo);

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
          <TipoDespesa tipos={tipos} />
          <label>
            Mês em que entra no cálculo
            <CampoMes name="competencia" valor={competenciaAtual()} />
          </label>
          <label>
            Comprovante (obrigatório)
            <input name="comprovante" type="file" accept="application/pdf,image/*" multiple required />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <BotaoEnviar>Salvar despesa</BotaoEnviar>
        </form>
      </main>
      <Menu podeLancar />
    </div>
  );
}

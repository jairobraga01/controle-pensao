import { redirect } from "next/navigation";
import { Menu } from "@/components/Menu";
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
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tipo de despesa</legend>
            <label className="opcao"><input type="radio" name="categoria" value="decisao" defaultChecked /> Prevista na decisão</label>
            <p className="dica">Escola, material, uniforme, plano de saúde, remédios e hospital. Entra no recibo judicial.</p>
            <label className="opcao"><input type="radio" name="categoria" value="combinada" /> Combinada entre vocês</label>
            <p className="dica">Natação, van, roupas, passeios. Entra no total do mês, só no demonstrativo.</p>
          </fieldset>
          <label>
            Divisão
            <select name="divisao" defaultValue="metade">
              <option value="metade">50% cada</option>
              <option value="integral_pagador">100% pai</option>
              <option value="integral_recebedora">100% mãe</option>
              <option value="fixo">Valor fixo para o pai</option>
            </select>
          </label>
          <label>
            Valor fixo do pai (só para “valor fixo”)
            <input name="valor_fixo" inputMode="decimal" placeholder="Ex.: 200,00" />
          </label>
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

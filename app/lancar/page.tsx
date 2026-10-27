import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { redirect } from "next/navigation";
import { CampoComprovante } from "@/components/CampoComprovante";
import { CampoMes } from "@/components/CampoMes";
import { Menu } from "@/components/Menu";
import { TipoDespesa } from "@/components/TipoDespesa";
import { carregarContexto, carregarTipos, competenciaAtual, hojeISO, type LinhaDespesa } from "@/lib/dados";
import { alterarDespesa } from "../despesas/[id]/actions";
import { lancarDespesa } from "./actions";

/** Lança uma despesa nova ou, com ?editar=<id>, altera uma já lançada na mesma tela. */
export default async function Lancar({ searchParams }: { searchParams: Promise<{ erro?: string; editar?: string }> }) {
  const { erro, editar } = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel === "advogado") redirect("/");
  const todos = await carregarTipos(ctx);

  let d: LinhaDespesa | null = null;
  if (editar) {
    const { data } = await ctx.supabase.from("despesas").select("*").eq("id", editar).maybeSingle();
    if (!data) redirect("/lancar");
    d = data as LinhaDespesa;
    if (d.lancado_por !== ctx.user.id) redirect(`/despesas/${d.id}`);
  }
  const tipos = todos.filter((t) => t.ativo || t.codigo === d?.tipo);
  const inicial = d && {
    codigo: d.tipo,
    divisao: d.divisao_tipo === "integral" ? `integral_${d.divisao_responsavel}` : d.divisao_tipo,
    fixo: d.divisao_valor_pagador ? (d.divisao_valor_pagador / 100).toFixed(2).replace(".", ",") : "",
  };

  return (
    <div className="app">
      <header className="topo">
        {d && <Link href={`/despesas/${d.id}`} aria-label="Voltar" className="botao contorno" style={{ width: 44, padding: 10 }}>‹</Link>}
        <h1>{d ? "Alterar despesa" : "Lançar despesa"}</h1>
      </header>
      <main className="conteudo">
        <form action={d ? alterarDespesa : lancarDespesa} className="cartao">
          {d && <input type="hidden" name="id" value={d.id} />}
          <label>Descrição<input name="descricao" required placeholder="Ex.: Uniforme escolar" defaultValue={d?.descricao} /></label>
          <div className="grade2">
            <label>
              Valor total (R$)
              <input name="valor" required inputMode="decimal" placeholder="0,00"
                defaultValue={d ? (d.valor_centavos / 100).toFixed(2).replace(".", ",") : undefined} />
            </label>
            <label>Data da compra<input name="data" type="date" required defaultValue={d?.data ?? hojeISO()} /></label>
          </div>
          <label>
            Quem pagou
            <select name="paga_por" defaultValue={d?.paga_por ?? ctx.eu.papel}>
              <option value="pagador">Pai</option>
              <option value="recebedora">Mãe</option>
            </select>
          </label>
          <TipoDespesa tipos={tipos} inicial={inicial ?? undefined} />
          <label>
            Mês em que entra no cálculo
            <CampoMes name="competencia" valor={d?.competencia ?? competenciaAtual()} />
          </label>
          <label>
            {d ? "Anexar outro comprovante (opcional)" : "Comprovante (opcional)"}
            <CampoComprovante processoId={ctx.processo.id} obrigatorio={false} />
          </label>
          {d && <p className="dica">Para excluir ou trocar um comprovante já anexado, use a tela da despesa.</p>}
          {erro && <p className="erro">{erro}</p>}
          <BotaoEnviar>{d ? "Salvar alterações" : "Salvar despesa"}</BotaoEnviar>
        </form>
      </main>
      <Menu podeLancar />
    </div>
  );
}

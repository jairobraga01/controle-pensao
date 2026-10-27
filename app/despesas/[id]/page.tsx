import Link from "next/link";
import { notFound } from "next/navigation";
import { Menu } from "@/components/Menu";
import { efeitoNoDevido, formatarReais, nomeDoMes } from "@/lib/calculo";
import { linksDosComprovantes } from "@/lib/comprovantes";
import { carregarContexto, carregarTipos, paraDespesa, type LinhaDespesa } from "@/lib/dados";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoComprovante } from "@/components/CampoComprovante";
import { CampoMes } from "@/components/CampoMes";
import { TipoDespesa } from "@/components/TipoDespesa";
import { alterarDespesa, anexarComprovante, contestar, excluirComprovante, excluirDespesa } from "./actions";
import { nomeDoRecibo, rotuloDoTipo } from "@/lib/tipos";

const DIVISAO = { metade: "50% cada", integral: "100%", fixo: "valor fixo para o pai" };

export default async function DetalheDespesa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  const ctx = await carregarContexto();
  const { data } = await ctx.supabase.from("despesas").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const d = data as LinhaDespesa;
  const [comprovantes, tipos] = await Promise.all([
    linksDosComprovantes(ctx, { coluna: "despesa_id", id }),
    carregarTipos(ctx),
  ]);
  const efeito = efeitoNoDevido(paraDespesa(d));
  const podeContestar = ctx.eu.papel !== "advogado" && d.lancado_por !== ctx.user.id && !d.contestada_em;
  const { data: confirmado } = await ctx.supabase.rpc("mes_confirmado", { p: ctx.processo.id, c: d.competencia });
  const podeAlterar = ctx.eu.papel !== "advogado" && d.lancado_por === ctx.user.id && !confirmado;
  const tiposAlteracao = tipos.filter((t) => t.ativo || t.codigo === d.tipo);
  const divisaoInicial =
    d.divisao_tipo === "integral" ? `integral_${d.divisao_responsavel}` : d.divisao_tipo;
  const fixoInicial = d.divisao_valor_pagador ? (d.divisao_valor_pagador / 100).toFixed(2).replace(".", ",") : "";

  return (
    <div className="app">
      <header className="topo">
        <Link href={`/despesas?mes=${d.competencia}`} aria-label="Voltar" className="botao contorno" style={{ width: 44, padding: 10 }}>‹</Link>
        <h1>{d.descricao}</h1>
      </header>
      <main className="conteudo">
        {erro && <div className="alerta">{erro}</div>}
        {ok && <div className="ok">Despesa alterada.</div>}
        <section className="cartao">
          <div className="linha"><span>Valor total</span><span className="num">{formatarReais(d.valor_centavos)}</span></div>
          <div className="linha"><span>Data</span><span>{d.data.split("-").reverse().join("/")}</span></div>
          <div className="linha"><span>Pago por</span><span>{d.paga_por === "pagador" ? "Pai" : "Mãe"}</span></div>
          <div className="linha"><span>Tipo</span><span>{rotuloDoTipo(tipos, d.tipo)} · {nomeDoRecibo(d.categoria).toLowerCase()}</span></div>
          <div className="linha">
            <span>Divisão</span>
            <span>
              {DIVISAO[d.divisao_tipo]}
              {d.divisao_tipo === "integral" && (d.divisao_responsavel === "pagador" ? " pai" : " mãe")}
              {d.divisao_tipo === "fixo" && ` (${formatarReais(d.divisao_valor_pagador ?? 0)})`}
            </span>
          </div>
          <div className="linha"><span>Mês do cálculo</span><span style={{ textTransform: "capitalize" }}>{nomeDoMes(d.competencia)}</span></div>
          <div className="divisor" />
          <div className="linha">
            <strong>Efeito no valor do mês</strong>
            <strong className="num">{efeito >= 0 ? "+" : ""}{formatarReais(efeito)}</strong>
          </div>
        </section>

        {d.contestada_em && (
          <div className="alerta">
            <strong>Contestada.</strong> {d.motivo_contestacao}
            <br />Fica fora do cálculo até ser resolvida.
          </div>
        )}

        <section className="cartao">
          <h2>Comprovantes</h2>
          {comprovantes.length === 0 && (
            <p className="dica">
              {d.importado ? "Importada da planilha antiga, sem comprovante anexado no app." : "Nenhum comprovante anexado."}
            </p>
          )}
          <ul className="lista">
            {comprovantes.map((c) => (
              <li key={c.id}>
                {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.nome_arquivo}</a> : c.nome_arquivo}
                {podeAlterar && (
                  <form action={excluirComprovante}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="comprovante" value={c.id} />
                    <button className="link" style={{ color: "var(--erro)" }}>Excluir</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {podeAlterar && (
            <form action={anexarComprovante}>
              <input type="hidden" name="id" value={d.id} />
              <label>{comprovantes.length ? "Trocar ou anexar outro comprovante" : "Anexar comprovante"}</label>
              <CampoComprovante processoId={ctx.processo.id} />
              <BotaoEnviar>Anexar</BotaoEnviar>
            </form>
          )}
        </section>

        {podeAlterar && (
          <details className="cartao">
            <summary><h2 style={{ display: "inline" }}>Alterar despesa</h2></summary>
            <form action={alterarDespesa} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={d.id} />
              <label>Descrição<input name="descricao" required defaultValue={d.descricao} /></label>
              <div className="grade2">
                <label>Valor total (R$)<input name="valor" required inputMode="decimal" defaultValue={(d.valor_centavos / 100).toFixed(2).replace(".", ",")} /></label>
                <label>Data<input name="data" type="date" required defaultValue={d.data} /></label>
              </div>
              <label>
                Quem pagou
                <select name="paga_por" defaultValue={d.paga_por}>
                  <option value="pagador">Pai</option>
                  <option value="recebedora">Mãe</option>
                </select>
              </label>
              <TipoDespesa tipos={tiposAlteracao} inicial={{ codigo: d.tipo, divisao: divisaoInicial, fixo: fixoInicial }} />
              <label>Mês em que entra no cálculo<CampoMes name="competencia" valor={d.competencia} /></label>
              <BotaoEnviar>Salvar alterações</BotaoEnviar>
            </form>
          </details>
        )}

        {podeAlterar && (
          <details className="cartao">
            <summary><h2 style={{ display: "inline", color: "var(--erro)" }}>Excluir despesa</h2></summary>
            <form action={excluirDespesa} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={d.id} />
              <label className="opcao"><input type="checkbox" name="confirmo" value="1" required /> Confirmo que quero excluir esta despesa e os comprovantes dela.</label>
              <button className="botao contorno" style={{ color: "var(--erro)" }}>Excluir</button>
            </form>
          </details>
        )}
        {!podeAlterar && ctx.eu.papel !== "advogado" && (
          <p className="dica">
            {confirmado
              ? "O recibo deste mês já foi confirmado; a despesa não pode mais ser alterada."
              : "Só quem lançou pode alterar esta despesa."}
          </p>
        )}

        {podeContestar && (
          <form action={contestar} className="cartao">
            <h2>Contestar esta despesa</h2>
            <input type="hidden" name="id" value={d.id} />
            <label>Motivo<textarea name="motivo" required /></label>
            <button className="botao contorno" type="submit">Contestar</button>
          </form>
        )}
      </main>
      <Menu podeLancar={ctx.eu.papel !== "advogado"} />
    </div>
  );
}

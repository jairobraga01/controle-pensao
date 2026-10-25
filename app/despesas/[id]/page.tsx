import Link from "next/link";
import { notFound } from "next/navigation";
import { Menu } from "@/components/Menu";
import { efeitoNoDevido, formatarReais, nomeDoMes } from "@/lib/calculo";
import { linksDosComprovantes } from "@/lib/comprovantes";
import { carregarContexto, paraDespesa, type LinhaDespesa } from "@/lib/dados";
import { contestar } from "./actions";
import { TIPOS_DESPESA, nomeDoRecibo } from "@/lib/tipos";

const DIVISAO = { metade: "50% cada", integral: "100%", fixo: "valor fixo para o pai" };

export default async function DetalheDespesa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await carregarContexto();
  const { data } = await ctx.supabase.from("despesas").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const d = data as LinhaDespesa;
  const comprovantes = await linksDosComprovantes(ctx, { coluna: "despesa_id", id });
  const efeito = efeitoNoDevido(paraDespesa(d));
  const podeContestar = ctx.eu.papel !== "advogado" && d.lancado_por !== ctx.user.id && !d.contestada_em;

  return (
    <div className="app">
      <header className="topo">
        <Link href="/" aria-label="Voltar" className="botao contorno" style={{ width: 44, padding: 10 }}>‹</Link>
        <h1>{d.descricao}</h1>
      </header>
      <main className="conteudo">
        <section className="cartao">
          <div className="linha"><span>Valor total</span><span className="num">{formatarReais(d.valor_centavos)}</span></div>
          <div className="linha"><span>Data</span><span>{d.data.split("-").reverse().join("/")}</span></div>
          <div className="linha"><span>Pago por</span><span>{d.paga_por === "pagador" ? "Pai" : "Mãe"}</span></div>
          <div className="linha"><span>Tipo</span><span>{TIPOS_DESPESA[d.tipo].rotulo} · {nomeDoRecibo(d.categoria).toLowerCase()}</span></div>
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
              </li>
            ))}
          </ul>
        </section>

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

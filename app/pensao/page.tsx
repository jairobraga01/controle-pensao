import { BotaoEnviar } from "@/components/BotaoEnviar";
import Link from "next/link";
import { CampoMes } from "@/components/CampoMes";
import { Menu } from "@/components/Menu";
import { carregarContexto, carregarTipos } from "@/lib/dados";
import { descreverDivisao, nomeDoRecibo, type TipoCadastro } from "@/lib/tipos";
import { ativarTipo, criarTipo, excluirPensao, salvarPensao, salvarTipo } from "./actions";

function valorDaDivisao(t?: TipoCadastro): string {
  const d = t?.divisao;
  if (!d) return "escolher";
  if (d.tipo === "integral") return `integral_${d.responsavel}`;
  return d.tipo;
}

function CamposDoTipo({ t, desabilitado }: { t?: TipoCadastro; desabilitado: boolean }) {
  const fixo = t?.divisao?.tipo === "fixo" ? t.divisao.valorPagador : null;
  return (
    <fieldset disabled={desabilitado} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <label>Nome<input name="rotulo" required defaultValue={t?.rotulo} /></label>
      <label>Detalhe (opcional)<input name="detalhe" defaultValue={t?.detalhe} placeholder="Ex.: mensalidade e material" /></label>
      <label>
        Recibo
        <select name="categoria" defaultValue={t?.categoria ?? "combinada"}>
          <option value="decisao">Recibo judicial (despesas da decisão)</option>
          <option value="combinada">Recibo extra (despesas combinadas)</option>
        </select>
      </label>
      <div className="grade2">
        <label>
          Divisão
          <select name="divisao" defaultValue={valorDaDivisao(t)}>
            <option value="metade">50% cada</option>
            <option value="integral_pagador">100% pai</option>
            <option value="integral_recebedora">100% mãe</option>
            <option value="fixo">Valor fixo para o pai</option>
            <option value="escolher">Escolher em cada lançamento</option>
          </select>
        </label>
        <label>
          Valor fixo do pai (R$)
          <input name="valor_fixo" inputMode="decimal" placeholder="só para valor fixo"
            defaultValue={fixo ? (fixo / 100).toFixed(2).replace(".", ",") : undefined} />
        </label>
      </div>
    </fieldset>
  );
}

export default async function DadosDaPensao({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const ctx = await carregarContexto();
  const p = ctx.processo;
  const leitura = ctx.eu.papel === "advogado";
  const [tipos, { data: regras }, contagens] = await Promise.all([
    carregarTipos(ctx),
    ctx.supabase.from("regras").select("vigencia_inicio, percentual_pensao, dia_vencimento, fundamento")
      .eq("processo_id", p.id).order("vigencia_inicio"),
    Promise.all(
      (["despesas", "pagamentos", "recibos"] as const).map((t) =>
        ctx.supabase.from(t).select("id", { count: "exact", head: true }).eq("processo_id", p.id),
      ),
    ),
  ]);
  const regra = regras?.find((r) => r.vigencia_inicio === p.inicio_competencia) ?? regras?.[0];
  const temLancamentos = contagens.some((c) => (c.count ?? 0) > 0);
  const ativos = tipos.filter((t) => t.ativo);
  const excluidos = tipos.filter((t) => !t.ativo);

  return (
    <div className="app">
      <header className="topo"><h1>Dados da Pensão</h1></header>
      <main className="conteudo">
        {ok && <div className="ok">{ok}</div>}
        {erro && <div className="alerta">{erro}</div>}
        {leitura && <p className="dica">Você vê os dados da pensão; só as partes podem alterá-los.</p>}

        <form action={salvarPensao} className="cartao">
          <h2>Processo</h2>
          <fieldset disabled={leitura} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <label>Nº do processo<input name="numero" required defaultValue={p.numero} /></label>
            <label>Vara e comarca<input name="vara" required defaultValue={p.vara} /></label>
            <label>Local do recibo<input name="cidade" required defaultValue={p.cidade} placeholder="Cidade/UF" /></label>
            <label>Nome completo do(a) filho(a)<input name="alimentando" required defaultValue={p.alimentando_nome} /></label>
            <div className="grade2">
              <label>% do salário mínimo<input name="percentual" inputMode="decimal" required defaultValue={String(regra?.percentual_pensao ?? 120).replace(".", ",")} /></label>
              <label>Vence no dia<input name="dia" type="number" min={1} max={28} required defaultValue={regra?.dia_vencimento ?? 10} /></label>
            </div>
            <label>Primeiro mês da pensão<CampoMes name="inicio" valor={p.inicio_competencia} /></label>
            <label>Fundamento (opcional)<input name="fundamento" defaultValue={regra?.fundamento ?? ""} placeholder="Decisão de dd/mm/aaaa" /></label>
            {!leitura && <BotaoEnviar>Salvar dados da pensão</BotaoEnviar>}
          </fieldset>
        </form>

        <section className="cartao">
          <h2>Tipos de despesa</h2>
          <p className="dica">
            Cada tipo define o recibo e a divisão das próximas despesas. O que já foi lançado
            continua como estava. Excluir um tipo só o tira da lista de lançamento.
          </p>
          <ul className="lista">
            {ativos.map((t) => (
              <li key={t.codigo} style={{ display: "block" }}>
                <details>
                  <summary style={{ cursor: "pointer" }}>
                    <strong>{t.rotulo}</strong>
                    <small>{nomeDoRecibo(t.categoria)} · {descreverDivisao(t.divisao)} · código {t.codigo}</small>
                  </summary>
                  <form action={salvarTipo} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                    <input type="hidden" name="codigo" value={t.codigo} />
                    <CamposDoTipo t={t} desabilitado={leitura} />
                    {!leitura && <BotaoEnviar>Salvar tipo</BotaoEnviar>}
                  </form>
                  {!leitura && (
                    <form action={ativarTipo} style={{ marginTop: 8 }}>
                      <input type="hidden" name="codigo" value={t.codigo} />
                      <input type="hidden" name="ativo" value="0" />
                      <button className="botao contorno" type="submit">Excluir tipo</button>
                    </form>
                  )}
                </details>
              </li>
            ))}
          </ul>
          {excluidos.length > 0 && (
            <>
              <h2>Tipos excluídos</h2>
              <ul className="lista">
                {excluidos.map((t) => (
                  <li key={t.codigo}>
                    <span>{t.rotulo}<small>{nomeDoRecibo(t.categoria)} · {descreverDivisao(t.divisao)}</small></span>
                    {!leitura && (
                      <form action={ativarTipo}>
                        <input type="hidden" name="codigo" value={t.codigo} />
                        <input type="hidden" name="ativo" value="1" />
                        <button className="link" type="submit">Restaurar</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {!leitura && (
          <details className="cartao">
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Novo tipo de despesa</summary>
            <form action={criarTipo} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <CamposDoTipo desabilitado={false} />
              <BotaoEnviar>Criar tipo</BotaoEnviar>
            </form>
          </details>
        )}

        <section className="cartao">
          <h2>Outros dados</h2>
          <Link href="/perfil" className="botao contorno">Meus dados para o recibo</Link>
          {!leitura && <Link href="/convidar" className="botao contorno">Convidar a outra parte ou o advogado</Link>}
        </section>

        {!leitura && (
          <form action={excluirPensao} className="cartao">
            <h2>Excluir a pensão</h2>
            {temLancamentos ? (
              <p className="dica">
                Esta pensão já tem despesas, pagamentos ou recibos e não pode ser excluída: o
                histórico vale como prova. Para corrigir dados, edite os campos acima.
              </p>
            ) : (
              <>
                <p className="dica">
                  Apaga o processo, as regras, os tipos de despesa e os convites. Só é possível
                  enquanto nada foi lançado.
                </p>
                <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" name="confirmo" value="sim" style={{ width: "auto" }} />
                  Confirmo que quero excluir esta pensão
                </label>
                <button className="botao contorno" type="submit" style={{ color: "var(--erro)" }}>Excluir pensão</button>
              </>
            )}
          </form>
        )}
      </main>
      <Menu podeLancar={!leitura} />
    </div>
  );
}

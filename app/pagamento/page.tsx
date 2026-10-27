import { BotaoEnviar } from "@/components/BotaoEnviar";
import { redirect } from "next/navigation";
import { Menu } from "@/components/Menu";
import { formatarReais, nomeDoMes } from "@/lib/calculo";
import { carregarContexto, carregarLancamentos, competenciaAtual, hojeISO, resumir } from "@/lib/dados";
import { ValorPagamento } from "@/components/ValorPagamento";
import { blocosDoMes } from "@/lib/planilha";
import { registrarPagamento } from "./actions";

export default async function Pagamento({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string }>;
}) {
  const { mes, erro } = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel !== "pagador") redirect("/");
  const competencia = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : competenciaAtual();
  const [{ despesas, pagamentos }, todas] = await Promise.all([
    carregarLancamentos(ctx, competencia),
    carregarLancamentos(ctx),
  ]);
  const r = resumir(ctx, competencia, despesas, pagamentos);
  const pendentes = blocosDoMes(competencia, todas.despesas).find((b) => b.chave === "pendentes")!;
  const sugerido = Math.max(r.saldo, 0);

  return (
    <div className="app">
      <header className="topo"><h1>Registrar pagamento</h1></header>
      <main className="conteudo">
        <section className="cartao">
          <small className="dica" style={{ textTransform: "capitalize" }}>{nomeDoMes(competencia)}</small>
          <span className="num" style={{ fontSize: 28, fontWeight: 700 }}>{formatarReais(sugerido)}</span>
          <div className="linha suave"><span>Recibo judicial (pensão + médicas, escolares e van)</span><span className="num">{formatarReais(r.totalRecibo)}</span></div>
          <div className="linha suave"><span>Recibo extra (combinadas)</span><span className="num">{formatarReais(r.totalDemonstrativo)}</span></div>
          <div className="linha suave"><span>Já pago</span><span className="num">{formatarReais(r.pago)}</span></div>
        </section>
        <form action={registrarPagamento} className="cartao">
          <input type="hidden" name="competencia" value={competencia} />
          <ValorPagamento
            saldo={sugerido}
            pendencias={pendentes.itens.length}
            totalPendencias={pendentes.totalValor}
            efeitoPendencias={pendentes.totalParte}
          />
          <label>Data<input name="data" type="date" required defaultValue={hojeISO()} /></label>
          <label>
            Forma
            <select name="forma" defaultValue="pix">
              <option value="pix">Pix</option>
              <option value="transferencia">Transferência bancária</option>
              <option value="dinheiro">Dinheiro (com recibo)</option>
            </select>
          </label>
          <label>
            Comprovante da transferência (obrigatório)
            <input name="comprovante" type="file" accept="application/pdf,image/*" multiple required />
          </label>
          <p className="dica">Ao salvar, o app gera o recibo judicial e o recibo extra do mês para a mãe confirmar.</p>
          {erro && <p className="erro">{erro}</p>}
          <BotaoEnviar>Salvar e gerar recibo</BotaoEnviar>
        </form>
      </main>
      <Menu podeLancar />
    </div>
  );
}

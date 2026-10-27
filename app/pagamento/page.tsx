import { BotaoEnviar } from "@/components/BotaoEnviar";
import { redirect } from "next/navigation";
import { CampoComprovante } from "@/components/CampoComprovante";
import { Menu } from "@/components/Menu";
import { ValorPagamento } from "@/components/ValorPagamento";
import { formatarReais, nomeDoMes, somarEfeitos } from "@/lib/calculo";
import {
  carregarContexto,
  carregarLancamentos,
  competenciaAtual,
  hojeISO,
  paraDespesa,
  resumir,
} from "@/lib/dados";
import { pagoPorRecibo } from "@/lib/dados-tipos";
import type { TipoRecibo } from "@/lib/recibo";
import { registrarPagamento } from "./actions";

const BLOCOS: { tipo: TipoRecibo; titulo: string; categoria: "decisao" | "combinada"; recibo: string }[] = [
  { tipo: "judicial", titulo: "Pensão + Despesas da Decisão", categoria: "decisao", recibo: "recibo judicial" },
  { tipo: "extra", titulo: "Despesas Extras", categoria: "combinada", recibo: "recibo de despesas extras" },
];

/** Registrar pagamento em dois blocos, cada um com o seu recibo. */
export default async function Pagamento({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string; bloco?: string }>;
}) {
  const { mes, erro, bloco } = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel !== "pagador") redirect("/");
  const competencia = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : competenciaAtual();
  const [{ despesas, pagamentos }, todas] = await Promise.all([
    carregarLancamentos(ctx, competencia),
    carregarLancamentos(ctx),
  ]);
  const r = resumir(ctx, competencia, despesas, pagamentos);
  const pago = pagoPorRecibo(r.totalRecibo, pagamentos);
  const devido = { judicial: r.totalRecibo, extra: r.totalDemonstrativo };
  const pendentes = todas.despesas.filter((d) => d.pendente && !d.contestada_em);

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Registrar pagamento</h1>
          <small style={{ textTransform: "capitalize" }}>{nomeDoMes(competencia)}</small>
        </div>
      </header>
      <main className="conteudo">
        {BLOCOS.map((b) => {
          const falta = Math.max(devido[b.tipo] - pago[b.tipo], 0);
          const pend = pendentes.filter((d) => d.categoria === b.categoria);
          return (
            <form key={b.tipo} action={registrarPagamento} className="cartao">
              <input type="hidden" name="competencia" value={competencia} />
              <input type="hidden" name="destino" value={b.tipo} />
              <h2>{b.titulo}</h2>
              <span className="num" style={{ fontSize: 26, fontWeight: 700 }}>{formatarReais(falta)}</span>
              <div className="linha suave"><span>Valor do {b.recibo}</span><span className="num">{formatarReais(devido[b.tipo])}</span></div>
              <div className="linha suave"><span>Já pago</span><span className="num">{formatarReais(pago[b.tipo])}</span></div>
              <ValorPagamento
                saldo={falta}
                pendencias={pend.length}
                totalPendencias={pend.reduce((s, d) => s + d.valor_centavos, 0)}
                efeitoPendencias={somarEfeitos(pend.map(paraDespesa))}
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
                <CampoComprovante processoId={ctx.processo.id} />
              </label>
              {erro && bloco === b.tipo && <p className="erro">{erro}</p>}
              <BotaoEnviar>Salvar e gerar {b.recibo}</BotaoEnviar>
            </form>
          );
        })}
        <p className="dica">Cada bloco gera o seu recibo, para a mãe confirmar no app.</p>
      </main>
      <Menu podeLancar />
    </div>
  );
}

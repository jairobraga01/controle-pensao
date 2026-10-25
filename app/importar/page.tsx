import { redirect } from "next/navigation";
import { Menu } from "@/components/Menu";
import { carregarContexto } from "@/lib/dados";
import { importar } from "./actions";

export default async function Importar({
  searchParams,
}: {
  searchParams: Promise<{ erros?: string; despesas?: string; pagamentos?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel !== "pagador") redirect("/");
  const erros = sp.erros ? (JSON.parse(sp.erros) as string[]) : [];

  return (
    <div className="app">
      <header className="topo"><h1>Importar planilha</h1></header>
      <main className="conteudo">
        {sp.despesas && (
          <div className="ok">
            Importados {sp.despesas} despesa(s) e {sp.pagamentos} pagamento(s). Eles aparecem no extrato
            marcados como “importado”, sem comprovante.
          </div>
        )}
        <section className="cartao">
          <h2>Como funciona</h2>
          <p className="dica">
            Baixe o modelo, preencha uma linha por despesa ou pagamento (pode abrir no Excel ou no
            LibreOffice) e salve como CSV separado por ponto e vírgula. Se alguma linha tiver erro,
            nada é importado e o app mostra o que corrigir.
          </p>
          <a className="botao contorno" href="/importar/modelo">Baixar modelo</a>
          <p className="dica">
            Tipos: medica, escolar, natacao_academia, van, roupas ou outra. Para “outra”, a coluna
            divisao recebe metade, pai, mae ou fixo (com valor_fixo). pago_por: pai ou mae.
          </p>
        </section>
        <form action={importar} className="cartao">
          <label>
            Arquivo CSV
            <input name="arquivo" type="file" accept=".csv,text/csv" required />
          </label>
          {erros.length > 0 && (
            <div className="alerta">
              <strong>Nada foi importado. Corrija estas linhas:</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {erros.slice(0, 30).map((e) => <li key={e}>{e}</li>)}
              </ul>
              {erros.length > 30 && <p>… e mais {erros.length - 30}.</p>}
            </div>
          )}
          <button className="botao" type="submit">Importar</button>
        </form>
      </main>
      <Menu podeLancar />
    </div>
  );
}

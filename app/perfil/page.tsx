import { Menu } from "@/components/Menu";
import { carregarContexto } from "@/lib/dados";
import { salvarPerfil } from "./actions";

export default async function Perfil({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const ctx = await carregarContexto();
  const e = ctx.eu;
  return (
    <div className="app">
      <header className="topo"><h1>Meus dados</h1></header>
      <main className="conteudo">
        <p className="dica">Esses dados aparecem no recibo. Só os participantes do processo os veem.</p>
        {ok && <div className="ok">Dados salvos.</div>}
        <form action={salvarPerfil} className="cartao">
          <label>Nome completo<input name="nome" required defaultValue={e.nome} /></label>
          {e.papel === "recebedora" && (
            <label>Qualificação<input name="qualificacao" defaultValue={e.qualificacao ?? ""} placeholder="brasileira, divorciada, profissão" /></label>
          )}
          <div className="grade2">
            <label>CPF<input name="cpf" defaultValue={e.cpf ?? ""} inputMode="numeric" /></label>
            <label>RG<input name="rg" defaultValue={e.rg ?? ""} /></label>
          </div>
          {e.papel === "recebedora" && (
            <label>Endereço<textarea name="endereco" defaultValue={e.endereco ?? ""} /></label>
          )}
          <button className="botao" type="submit">Salvar</button>
        </form>
      </main>
      <Menu podeLancar={e.papel !== "advogado"} />
    </div>
  );
}

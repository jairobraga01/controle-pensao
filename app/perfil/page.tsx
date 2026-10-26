import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Menu } from "@/components/Menu";
import { carregarContexto } from "@/lib/dados";
import { salvarPerfil, trocarSenha } from "./actions";

export default async function Perfil({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const ctx = await carregarContexto();
  const e = ctx.eu;
  return (
    <div className="app">
      <header className="topo"><h1>Meus dados</h1></header>
      <main className="conteudo">
        <p className="dica">Esses dados aparecem no recibo. Só os participantes do processo os veem.</p>
        {ok && <div className="ok">{ok === "senha" ? "Senha alterada." : "Dados salvos."}</div>}
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
          <BotaoEnviar>Salvar</BotaoEnviar>
        </form>
        <form action={trocarSenha} className="cartao">
          <label>
            Nova senha
            <input name="senha" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          {erro === "senha" && <p className="erro">Não foi possível trocar a senha. Use pelo menos 8 caracteres.</p>}
          <button className="botao contorno" type="submit">Trocar senha</button>
        </form>
      </main>
      <Menu podeLancar={e.papel !== "advogado"} />
    </div>
  );
}

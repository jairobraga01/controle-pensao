import { criarConta, entrar, receberLink } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string; voltar?: string }>;
}) {
  const { enviado, erro, voltar } = await searchParams;
  return (
    <div className="app">
      <header className="topo">
        <h1>Controle de Pensão</h1>
      </header>
      <main className="conteudo">
        {enviado && <div className="ok">Enviamos um link para o seu e-mail. Abra-o neste aparelho.</div>}
        <form action={entrar} className="cartao">
          <h2>Entrar</h2>
          <input type="hidden" name="voltar" value={voltar ?? "/"} />
          <label>
            E-mail
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input name="senha" type="password" required minLength={8} autoComplete="current-password" />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao" type="submit">Entrar</button>
          <button className="botao contorno" type="submit" formAction={criarConta}>
            Criar conta com este e-mail e senha
          </button>
          <p className="dica">
            Esqueceu a senha? Preencha só o e-mail e{" "}
            <button type="submit" formAction={receberLink} formNoValidate className="link">
              receba um link de acesso
            </button>
            . Depois troque a senha em Meus dados.
          </p>
        </form>
      </main>
    </div>
  );
}

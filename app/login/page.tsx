import { entrar } from "./actions";

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
        {enviado ? (
          <div className="ok">Enviamos um link de acesso para o seu e-mail. Abra-o neste aparelho.</div>
        ) : (
          <form action={entrar} className="cartao">
            <h2>Entrar</h2>
            <p className="dica">Você recebe um link por e-mail, sem senha.</p>
            <input type="hidden" name="voltar" value={voltar ?? "/"} />
            <label>
              E-mail
              <input name="email" type="email" required autoComplete="email" />
            </label>
            {erro && <p className="erro">{erro}</p>}
            <button className="botao" type="submit">Receber link de acesso</button>
          </form>
        )}
      </main>
    </div>
  );
}

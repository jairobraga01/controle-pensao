import { BotaoEnviar } from "@/components/BotaoEnviar";
import { aceitar } from "./actions";

export default async function Convite({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  return (
    <div className="app">
      <header className="topo"><h1>Aceitar convite</h1></header>
      <main className="conteudo">
        <form action={aceitar} className="cartao">
          <p className="dica">Você foi convidado(a) para acompanhar a pensão neste app.</p>
          <input type="hidden" name="token" value={token} />
          <label>Seu nome completo<input name="nome" required /></label>
          {erro && <p className="erro">{erro}</p>}
          <BotaoEnviar>Aceitar</BotaoEnviar>
        </form>
      </main>
    </div>
  );
}

import { BotaoEnviar } from "@/components/BotaoEnviar";
import { redirect } from "next/navigation";
import { Menu } from "@/components/Menu";
import { carregarContexto } from "@/lib/dados";
import { convidar } from "./actions";

function mensagemConvite(link: string) {
  return `Olá! Este é o convite para acompanhar os lançamentos e recibos da pensão no app: ${link}`;
}

export default async function Convidar({ searchParams }: { searchParams: Promise<{ link?: string; email?: string; erro?: string }> }) {
  const { link, email, erro } = await searchParams;
  const ctx = await carregarContexto();
  if (ctx.eu.papel === "advogado") redirect("/");
  const outra = ctx.eu.papel === "pagador" ? "recebedora" : "pagador";
  const jaTemOutra = ctx.membros.some((m) => m.papel === outra);
  const { data: pendentes } = await ctx.supabase
    .from("convites")
    .select("email, papel, aceito_em")
    .eq("processo_id", ctx.processo.id)
    .order("criado_em", { ascending: false });

  return (
    <div className="app">
      <header className="topo"><h1>Convidar</h1></header>
      <main className="conteudo">
        {link && (
          <div className="ok" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span>Convite criado. Envie o link para a pessoa; ela entra com o mesmo e-mail do convite.</span>
            <code style={{ wordBreak: "break-all", fontWeight: 400 }}>{link}</code>
            <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(mensagemConvite(link))}`} target="_blank" rel="noreferrer">
              Enviar pelo WhatsApp
            </a>
            <a className="botao contorno" href={`mailto:${encodeURIComponent(email ?? "")}?subject=${encodeURIComponent("Convite: controle da pensão")}&body=${encodeURIComponent(mensagemConvite(link))}`}>
              Enviar por e-mail
            </a>
          </div>
        )}
        <form action={convidar} className="cartao">
          <label>E-mail da pessoa<input name="email" type="email" required /></label>
          <label>
            Papel
            <select name="papel" defaultValue={jaTemOutra ? "advogado" : outra}>
              {!jaTemOutra && <option value={outra}>{outra === "recebedora" ? "Mãe (recebe a pensão)" : "Pai (paga a pensão)"}</option>}
              <option value="advogado">Advogado(a), só leitura</option>
            </select>
          </label>
          {erro && <p className="erro">{erro}</p>}
          <BotaoEnviar>Criar convite</BotaoEnviar>
        </form>
        {!!pendentes?.length && (
          <section className="cartao">
            <h2>Convites</h2>
            <ul className="lista">
              {pendentes.map((c) => (
                <li key={c.email + c.papel}>
                  <span>{c.email}<small>{c.papel}</small></span>
                  <span className={`selo ${c.aceito_em ? "quitado" : "aberto"}`}>{c.aceito_em ? "Aceito" : "Pendente"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Menu podeLancar />
    </div>
  );
}

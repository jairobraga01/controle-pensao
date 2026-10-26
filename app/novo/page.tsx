import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarProcesso } from "./actions";

export default async function Novo({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("membros").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  if (count) redirect("/");

  return (
    <div className="app">
      <header className="topo">
        <h1>Cadastrar processo</h1>
      </header>
      <main className="conteudo">
        <p className="dica">
          Se a outra parte já cadastrou o processo, peça a ela um convite em vez de cadastrar de novo.
        </p>
        <form action={criarProcesso} className="cartao">
          <label>Seu nome completo<input name="nome" required /></label>
          <label>
            Você é
            <select name="papel" defaultValue="pagador">
              <option value="pagador">Quem paga a pensão</option>
              <option value="recebedora">Quem recebe a pensão</option>
            </select>
          </label>
          <label>Nº do processo<input name="numero" required placeholder="0000000-00.0000.0.00.0000" /></label>
          <label>Vara e comarca<input name="vara" required placeholder="1ª Vara de Família da Comarca de ..." /></label>
          <label>Cidade do recibo<input name="cidade" required placeholder="Cidade/UF" /></label>
          <label>Nome completo do(a) filho(a)<input name="alimentando" required /></label>
          <div className="grade2">
            <label>% do salário mínimo<input name="percentual" type="number" step="0.01" defaultValue={120} required /></label>
            <label>Vence no dia<input name="dia" type="number" min={1} max={28} defaultValue={10} required /></label>
          </div>
          <label>
            Primeiro mês da pensão
            <input name="inicio" type="month" required />
          </label>
          <label>Fundamento (opcional)<input name="fundamento" placeholder="Decisão de dd/mm/aaaa" /></label>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao" type="submit">Cadastrar</button>
        </form>
      </main>
    </div>
  );
}

import Link from "next/link";
import { incluirPendente } from "@/app/actions";
import { FormDespesa } from "@/components/FormDespesa";
import { formatarReais, type Parte } from "@/lib/calculo";
import { mesParaTela } from "@/lib/mes";
import type { Bloco } from "@/lib/planilha";
import type { TipoCadastro } from "@/lib/tipos";

function dataCurta(iso: string): string {
  return iso.split("-").reverse().join("-");
}

/** Um bloco da planilha (aba 10-2026): cabeçalho, linhas, total e "+ Incluir despesa". */
export function BlocoPlanilha(props: {
  bloco: Bloco;
  titulo: string;
  totalRotulo: string;
  competencia: string;
  tipos: TipoCadastro[];
  podeLancar: boolean;
  voltar: string;
  hoje: string;
  nomes: Record<Parte, string>;
  processoId: string;
}) {
  const { bloco, competencia } = props;
  const tipos = bloco.categoria ? props.tipos.filter((t) => t.categoria === bloco.categoria) : props.tipos;
  const ehPendente = bloco.chave === "pendentes";
  return (
    <section className="cartao planilha" id={bloco.chave}>
      <div className="pl-linha pl-cab">
        <span>{props.titulo}</span>
        <span>Valor</span>
        <span>Valor/2</span>
      </div>
      {bloco.itens.map((i) => (
        <div key={i.id}>
          <Link href={`/despesas/${i.id}`} className="pl-linha">
            <span>{dataCurta(i.data)} - {i.descricao}</span>
            <span className="num">{formatarReais(i.valor)}</span>
            <span className={`num${i.parte < 0 ? " negativo" : ""}`}>{formatarReais(i.parte)}</span>
          </Link>
          {ehPendente && props.podeLancar && (
            <form action={incluirPendente} className="pl-acao">
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="mes" value={competencia} />
              <input type="hidden" name="voltar" value={props.voltar} />
              <button className="link">Incluir no cálculo de {mesParaTela(competencia)}</button>
            </form>
          )}
        </div>
      ))}
      {bloco.itens.length === 0 && <p className="dica pl-vazio">Nenhuma despesa.</p>}
      <div className="pl-linha pl-total">
        <span>{props.totalRotulo}</span>
        <span className="num">{formatarReais(bloco.totalValor)}</span>
        <span className={`num${bloco.totalParte < 0 ? " negativo" : ""}`}>{formatarReais(bloco.totalParte)}</span>
      </div>
      {props.podeLancar && tipos.length > 0 && (
        <details className="incluir">
          <summary>+ Incluir despesa</summary>
          <FormDespesa
            tipos={tipos}
            pagaPor={bloco.pagaPor}
            competencia={competencia}
            pendente={ehPendente}
            voltar={props.voltar}
            hoje={props.hoje}
            nomes={props.nomes}
            processoId={props.processoId}
          />
        </details>
      )}
    </section>
  );
}

import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoComprovante } from "@/components/CampoComprovante";
import { CampoMes } from "@/components/CampoMes";
import { TipoDespesa } from "@/components/TipoDespesa";
import { lancarDespesa } from "@/app/lancar/actions";
import type { Parte } from "@/lib/calculo";
import type { TipoCadastro } from "@/lib/tipos";

/** Formulário curto de despesa, aberto dentro de um bloco da tela inicial. */
export function FormDespesa(props: {
  tipos: TipoCadastro[];
  pagaPor: Parte | null;
  competencia: string;
  pendente: boolean;
  voltar: string;
  hoje: string;
  nomes: Record<Parte, string>;
  processoId: string;
}) {
  return (
    <form action={lancarDespesa} className="form-bloco">
      <input type="hidden" name="voltar" value={props.voltar} />
      {props.pendente && <input type="hidden" name="pendente" value="1" />}
      <label>Descrição<input name="descricao" required placeholder="Ex.: Uniforme escolar" /></label>
      <div className="grade2">
        <label>Valor total (R$)<input name="valor" required inputMode="decimal" placeholder="0,00" /></label>
        <label>Data<input name="data" type="date" required defaultValue={props.hoje} /></label>
      </div>
      {props.pagaPor ? (
        <input type="hidden" name="paga_por" value={props.pagaPor} />
      ) : (
        <label>
          Quem pagou
          <select name="paga_por" defaultValue="recebedora">
            <option value="recebedora">{props.nomes.recebedora}</option>
            <option value="pagador">{props.nomes.pagador}</option>
          </select>
        </label>
      )}
      <TipoDespesa tipos={props.tipos} />
      {props.pendente ? (
        <input type="hidden" name="competencia" value={props.competencia.split("-").reverse().join("/")} />
      ) : (
        <label>
          Mês em que entra no cálculo
          <CampoMes name="competencia" valor={props.competencia} />
        </label>
      )}
      <label>
        Comprovante (obrigatório)
        <CampoComprovante processoId={props.processoId} />
      </label>
      <BotaoEnviar>Incluir despesa</BotaoEnviar>
    </form>
  );
}

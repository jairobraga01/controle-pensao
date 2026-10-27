"use client";

import { useState } from "react";
import { formatarReais } from "@/lib/calculo";

const paraCampo = (c: number) => (Math.max(c, 0) / 100).toFixed(2).replace(".", ",");

/** Valor sugerido do pagamento, somando as pendências quando a pessoa marca para quitá-las. */
export function ValorPagamento({ saldo, pendencias, totalPendencias, efeitoPendencias }: {
  saldo: number;
  pendencias: number;
  totalPendencias: number;
  efeitoPendencias: number;
}) {
  const [quitar, setQuitar] = useState(false);
  const [valor, setValor] = useState(paraCampo(saldo));

  return (
    <>
      {pendencias > 0 && (
        <label className="opcao alerta">
          <input
            type="checkbox"
            name="quitar_pendentes"
            value="1"
            checked={quitar}
            onChange={(e) => {
              setQuitar(e.target.checked);
              setValor(paraCampo(saldo + (e.target.checked ? efeitoPendencias : 0)));
            }}
          />
          <span>
            <strong>Quitar também as pendências</strong>
            <br />
            {formatarReais(totalPendencias)} em {pendencias} {pendencias === 1 ? "despesa" : "despesas"}. Entram neste mês
            (parte a transferir: {formatarReais(efeitoPendencias)}).
          </span>
        </label>
      )}
      <label>
        Valor pago (R$)
        <input name="valor" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
    </>
  );
}

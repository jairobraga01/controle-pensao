"use client";

import { useState } from "react";
import { TIPOS_DESPESA, nomeDoRecibo, type TipoDespesa as Tipo } from "@/lib/tipos";

export function TipoDespesa() {
  const [tipo, setTipo] = useState<Tipo>("escolar");
  const t = TIPOS_DESPESA[tipo];
  const [divisao, setDivisao] = useState("metade");

  return (
    <>
      <label>
        Tipo de despesa
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          {Object.entries(TIPOS_DESPESA).map(([id, x]) => (
            <option key={id} value={id}>{x.rotulo}</option>
          ))}
        </select>
        <span className="dica">
          {t.detalhe}. Entra no <strong>{nomeDoRecibo(t.categoria).toLowerCase()}</strong>.
        </span>
      </label>
      {tipo === "outra" && (
        <>
          <label>
            Divisão
            <select name="divisao" value={divisao} onChange={(e) => setDivisao(e.target.value)}>
              <option value="metade">50% cada</option>
              <option value="integral_pagador">100% pai</option>
              <option value="integral_recebedora">100% mãe</option>
              <option value="fixo">Valor fixo para o pai</option>
            </select>
          </label>
          {divisao === "fixo" && (
            <label>
              Valor fixo do pai (R$)
              <input name="valor_fixo" inputMode="decimal" required placeholder="0,00" />
            </label>
          )}
        </>
      )}
    </>
  );
}

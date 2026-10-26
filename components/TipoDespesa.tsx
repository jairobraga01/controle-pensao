"use client";

import { useState } from "react";
import { descreverDivisao, nomeDoRecibo, type TipoCadastro } from "@/lib/tipos";

export function TipoDespesa({ tipos }: { tipos: TipoCadastro[] }) {
  const [codigo, setCodigo] = useState(tipos.find((t) => t.codigo === "escolar")?.codigo ?? tipos[0]?.codigo ?? "");
  const t = tipos.find((x) => x.codigo === codigo);
  const [divisao, setDivisao] = useState("metade");

  return (
    <>
      <label>
        Tipo de despesa
        <select name="tipo" value={codigo} onChange={(e) => setCodigo(e.target.value)}>
          {tipos.map((x) => (
            <option key={x.codigo} value={x.codigo}>{x.rotulo}</option>
          ))}
        </select>
        {t && (
          <span className="dica">
            {t.detalhe || descreverDivisao(t.divisao)}. Entra no <strong>{nomeDoRecibo(t.categoria).toLowerCase()}</strong>.
          </span>
        )}
      </label>
      {t && !t.divisao && (
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

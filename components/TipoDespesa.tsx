"use client";

import { useEffect, useRef, useState } from "react";
import { formatarReais, lerReais, partes, type Categoria, type Divisao } from "@/lib/calculo";
import { descreverDivisao, nomeDoRecibo, type TipoCadastro } from "@/lib/tipos";

const ROTULO_CATEGORIA: Record<Categoria, string> = { decisao: "Prevista na decisão", combinada: "Combinada" };

function divisaoEscolhida(v: string, fixo: string): Divisao | null {
  if (v === "metade") return { tipo: "metade" };
  if (v === "integral_pagador") return { tipo: "integral", responsavel: "pagador" };
  if (v === "integral_recebedora") return { tipo: "integral", responsavel: "recebedora" };
  const valorPagador = lerReais(fixo);
  return valorPagador ? { tipo: "fixo", valorPagador } : null;
}

/** Categoria (prevista na decisão ou combinada), tipo, divisão e a parte do pai, como no protótipo. */
export function TipoDespesa({ tipos, inicial }: {
  tipos: TipoCadastro[];
  /** Valores de uma despesa já lançada, ao alterar. */
  inicial?: { codigo: string; divisao: string; fixo: string };
}) {
  const categorias = (["decisao", "combinada"] as Categoria[]).filter((c) => tipos.some((t) => t.categoria === c));
  const tipoInicial = inicial && tipos.find((t) => t.codigo === inicial.codigo);
  const [categoria, setCategoria] = useState<Categoria>(tipoInicial?.categoria ?? categorias[0] ?? "decisao");
  const daCategoria = tipos.filter((t) => t.categoria === categoria);
  const [codigo, setCodigo] = useState(
    tipoInicial?.codigo ??
      tipos.find((t) => t.codigo === "escolar" && t.categoria === categoria)?.codigo ??
      daCategoria[0]?.codigo ??
      "",
  );
  const t = tipos.find((x) => x.codigo === codigo);
  const [divisao, setDivisao] = useState(inicial?.divisao || "metade");
  const [fixo, setFixo] = useState(inicial?.fixo ?? "");

  // Lê o valor total digitado no mesmo formulário para mostrar a parte do pai.
  const ancora = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState<number | null>(null);
  useEffect(() => {
    const campo = ancora.current?.closest("form")?.querySelector<HTMLInputElement>('input[name="valor"]');
    if (!campo) return;
    const ler = () => setValor(lerReais(campo.value));
    ler();
    campo.addEventListener("input", ler);
    return () => campo.removeEventListener("input", ler);
  }, []);

  const d = t?.divisao ?? divisaoEscolhida(divisao, fixo);
  const partePai =
    valor && d ? partes({ id: "", descricao: "", data: "", valor, pagaPor: "pagador", categoria, divisao: d }).pagador : null;

  function trocarCategoria(c: Categoria) {
    setCategoria(c);
    setCodigo(tipos.find((x) => x.categoria === c)?.codigo ?? "");
  }

  return (
    <>
      <span ref={ancora} hidden />
      {categorias.length > 1 && (
        <div className="segmento" role="radiogroup" aria-label="Tipo de despesa">
          {categorias.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={categoria === c} onClick={() => trocarCategoria(c)}>
              {ROTULO_CATEGORIA[c]}
            </button>
          ))}
        </div>
      )}
      <label>
        Tipo de despesa
        <select name="tipo" value={codigo} onChange={(e) => setCodigo(e.target.value)}>
          {daCategoria.map((x) => (
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
              <option value="metade">50% cada (padrão)</option>
              <option value="integral_pagador">100% pai</option>
              <option value="integral_recebedora">100% mãe</option>
              <option value="fixo">Valor fixo para o pai</option>
            </select>
          </label>
          {divisao === "fixo" && (
            <label>
              Valor fixo do pai (R$)
              <input name="valor_fixo" inputMode="decimal" required placeholder="0,00" value={fixo} onChange={(e) => setFixo(e.target.value)} />
            </label>
          )}
        </>
      )}
      {partePai !== null && <p className="dica"><strong>Parte do pai: {formatarReais(partePai)}</strong></p>}
    </>
  );
}

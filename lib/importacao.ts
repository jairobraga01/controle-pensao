// Leitura do modelo CSV de importação (separado por ponto e vírgula, como o
// Excel e o LibreOffice salvam em português).

import { lerReais, type Divisao, type Parte } from "./calculo";
import { ehTipo, regraDoTipo, type TipoDespesa } from "./tipos";

export const CABECALHO = [
  "lancamento", "competencia", "data", "descricao", "tipo", "valor", "pago_por", "divisao", "valor_fixo", "forma",
] as const;

export const MODELO_CSV =
  CABECALHO.join(";") +
  "\n" +
  [
    "despesa;2026-10;2026-10-05;Mensalidade;escolar;1554,37;mae;;;",
    "despesa;2026-10;2026-10-05;Plano de saúde;medica;453,39;pai;;;",
    "despesa;2026-10;2026-10-05;Van;van;600,00;mae;;;",
    "despesa;2026-06;2026-05-31;Roupas;roupas;769,20;mae;;;",
    "despesa;2026-06;2026-06-11;Salão;outra;70,00;mae;metade;;",
    "pagamento;2026-10;2026-10-08;;;2835,36;;;;pix",
  ].join("\n") +
  "\n";

export interface DespesaImportada {
  linha: number;
  competencia: string;
  data: string;
  descricao: string;
  tipo: TipoDespesa;
  valor: number;
  pagaPor: Parte;
  divisao: Divisao;
  categoria: "decisao" | "combinada";
}

export interface PagamentoImportado {
  linha: number;
  competencia: string;
  data: string;
  valor: number;
  forma: "pix" | "transferencia" | "dinheiro";
}

export interface ResultadoImportacao {
  despesas: DespesaImportada[];
  pagamentos: PagamentoImportado[];
  erros: string[];
}

const COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Aceita AAAA-MM-DD ou DD/MM/AAAA. */
function lerData(v: string): string | null {
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso) ? iso : null;
}

function lerParte(v: string): Parte | null {
  const s = v.toLowerCase();
  if (["pai", "pagador"].includes(s)) return "pagador";
  if (["mae", "mãe", "recebedora"].includes(s)) return "recebedora";
  return null;
}

function lerDivisao(v: string, fixo: string): Divisao | null {
  switch (v.toLowerCase()) {
    case "metade": return { tipo: "metade" };
    case "pai": return { tipo: "integral", responsavel: "pagador" };
    case "mae": case "mãe": return { tipo: "integral", responsavel: "recebedora" };
    case "fixo": {
      const valorPagador = lerReais(fixo);
      return valorPagador ? { tipo: "fixo", valorPagador } : null;
    }
    default: return null;
  }
}

function dividir(linha: string): string[] {
  // Campos entre aspas podem conter ";".
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else aspas = !aspas;
    } else if (c === ";" && !aspas) { out.push(atual.trim()); atual = ""; }
    else atual += c;
  }
  out.push(atual.trim());
  return out;
}

export function lerCsv(texto: string): ResultadoImportacao {
  const res: ResultadoImportacao = { despesas: [], pagamentos: [], erros: [] };
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const cab = dividir(linhas[0] ?? "").map((c) => c.toLowerCase());
  const faltando = CABECALHO.filter((c) => !cab.includes(c));
  if (faltando.length) {
    res.erros.push(`Cabeçalho incompleto. Faltam as colunas: ${faltando.join(", ")}. Use o modelo.`);
    return res;
  }

  for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;
    const n = i + 1;
    const campos = dividir(linhas[i]);
    const c = Object.fromEntries(cab.map((k, j) => [k, campos[j] ?? ""])) as Record<(typeof CABECALHO)[number], string>;
    const erro = (msg: string) => res.erros.push(`Linha ${n}: ${msg}`);

    if (!COMPETENCIA.test(c.competencia)) { erro(`competência "${c.competencia}" inválida (use AAAA-MM).`); continue; }
    const data = lerData(c.data);
    if (!data) { erro(`data "${c.data}" inválida.`); continue; }
    const valor = lerReais(c.valor);
    if (!valor) { erro(`valor "${c.valor}" inválido.`); continue; }

    if (c.lancamento.toLowerCase() === "pagamento") {
      const forma = (c.forma || "pix").toLowerCase();
      if (forma !== "pix" && forma !== "transferencia" && forma !== "dinheiro") { erro(`forma "${c.forma}" inválida.`); continue; }
      res.pagamentos.push({ linha: n, competencia: c.competencia, data, valor, forma });
      continue;
    }
    if (c.lancamento.toLowerCase() !== "despesa") { erro(`lançamento deve ser "despesa" ou "pagamento".`); continue; }
    if (!c.descricao) { erro("descrição vazia."); continue; }
    if (!ehTipo(c.tipo)) { erro(`tipo "${c.tipo}" inválido.`); continue; }
    const pagaPor = lerParte(c.pago_por);
    if (!pagaPor) { erro(`pago_por deve ser "pai" ou "mae".`); continue; }
    let manual: Divisao | undefined;
    if (c.tipo === "outra") {
      const d = lerDivisao(c.divisao, c.valor_fixo);
      if (!d) { erro(`para o tipo "outra", informe a divisão (metade, pai, mae ou fixo + valor_fixo).`); continue; }
      manual = d;
    }
    const regra = regraDoTipo(c.tipo, manual);
    res.despesas.push({
      linha: n, competencia: c.competencia, data, descricao: c.descricao, tipo: c.tipo,
      valor, pagaPor, ...regra,
    });
  }
  return res;
}

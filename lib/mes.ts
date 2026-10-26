// Mês digitado pela pessoa. Nem todo navegador tem o seletor de mês
// (o Firefox e o Safari de computador mostram um campo de texto).

/** Aceita "10/2024", "1/2025" ou "2024-10" e devolve "AAAA-MM"; null se inválido. */
export function lerMes(v: string): string | null {
  const t = v.trim();
  let ano: number, mes: number;
  let m = /^(\d{1,2})\s*[/\-.]\s*(\d{4})$/.exec(t);
  if (m) {
    mes = Number(m[1]);
    ano = Number(m[2]);
  } else if ((m = /^(\d{4})-(\d{1,2})$/.exec(t))) {
    ano = Number(m[1]);
    mes = Number(m[2]);
  } else {
    return null;
  }
  if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) return null;
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/** "2024-10" → "10/2024". */
export function mesParaTela(competencia: string): string {
  const [a, m] = competencia.split("-");
  return `${m}/${a}`;
}

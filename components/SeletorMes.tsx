"use client";

import { useRouter } from "next/navigation";
import { nomeDoMes } from "@/lib/calculo";

/** Escolhe o mês de competência da tela inicial; os meses vêm do mais recente ao mais antigo. */
export function SeletorMes({ meses, atual, base = "/" }: { meses: string[]; atual: string; base?: string }) {
  const router = useRouter();
  const i = meses.indexOf(atual);
  const ir = (m: string | undefined) => m && router.push(`${base}?mes=${m}`);

  return (
    <div className="seletor-mes">
      <button type="button" aria-label="Mês anterior" disabled={i >= meses.length - 1} onClick={() => ir(meses[i + 1])}>‹</button>
      <select aria-label="Mês de competência" value={atual} onChange={(e) => ir(e.target.value)}>
        {meses.map((m) => (
          <option key={m} value={m}>{nomeDoMes(m)}</option>
        ))}
      </select>
      <button type="button" aria-label="Próximo mês" disabled={i <= 0} onClick={() => ir(meses[i - 1])}>›</button>
    </div>
  );
}

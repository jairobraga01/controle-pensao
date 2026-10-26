import { mesParaTela } from "@/lib/mes";

/** Campo de mês como texto MM/AAAA, que funciona em qualquer navegador. */
export function CampoMes({ name, valor }: { name: string; valor?: string }) {
  return (
    <input
      name={name}
      required
      inputMode="numeric"
      placeholder="MM/AAAA"
      pattern="\d{1,2}/\d{4}"
      title="Mês e ano, por exemplo 10/2024"
      defaultValue={valor ? mesParaTela(valor) : undefined}
    />
  );
}

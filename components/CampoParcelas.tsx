import { MAX_PARCELAS } from "@/lib/parcelas";

/** Escolha de à vista ou parcelado; cada parcela vira uma despesa em um mês seguido. */
export function CampoParcelas() {
  return (
    <label>
      Parcelas
      <select name="parcelas" defaultValue="1">
        <option value="1">À vista</option>
        {Array.from({ length: MAX_PARCELAS - 1 }, (_, i) => i + 2).map((n) => (
          <option key={n} value={n}>{n}x (valor total ÷ {n})</option>
        ))}
      </select>
      <span className="dica">Parcelado: lança uma despesa por mês, a partir do mês do cálculo, com 1/N na descrição.</span>
    </label>
  );
}

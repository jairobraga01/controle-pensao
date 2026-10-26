"use client";

import { useFormStatus } from "react-dom";

/** Botão principal de formulário: fica desativado enquanto envia, para não salvar duas vezes. */
export function BotaoEnviar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="botao" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Enviando…" : children}
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Painel", d: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/lancar", rotulo: "Lançar", d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8" },
  { href: "/extrato", rotulo: "Extrato", d: "M4 6h16M4 12h16M4 18h10" },
  { href: "/recibos", rotulo: "Recibos", d: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" },
  { href: "/pensao", rotulo: "Pensão", d: "M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1M13 4v4M7 10v4M15 16v4" },
];

export function Menu({ podeLancar }: { podeLancar: boolean }) {
  const atual = usePathname();
  return (
    <nav className="menu" aria-label="Navegação principal">
      <ul>
        {ITENS.filter((i) => podeLancar || i.href !== "/lancar").map((i) => {
          const ativo = i.href === "/" ? atual === "/" : atual.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={ativo ? "page" : undefined}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={i.d} />
                </svg>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

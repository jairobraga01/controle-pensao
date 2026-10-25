import { MODELO_CSV } from "@/lib/importacao";

export function GET() {
  // BOM para o Excel abrir os acentos corretamente.
  return new Response("﻿" + MODELO_CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao.csv"',
    },
  });
}

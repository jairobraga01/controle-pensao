import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Pensão",
  description: "Lançamentos, pagamentos e recibos de pensão alimentícia",
  appleWebApp: { capable: true, title: "Pensão" },
};

export const viewport: Viewport = { themeColor: "#0f5c5c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

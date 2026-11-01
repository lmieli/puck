import type { Metadata } from "next";
import "./globals.css";
import "@/blocks/site.css";

export const metadata: Metadata = {
  title: { default: "Vitrine", template: "%s · Vitrine" },
  description:
    "Crie e edite sites cinematográficos para seus clientes, com IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;650;700;800&family=Instrument+Serif:ital@0;1&family=Manrope:wght@600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

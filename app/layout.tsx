import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KuatiaPost · Datos e integración",
  description:
    "Mesa de trabajo para preparar JSON, conectar tu integración y consultar documentación KuatiaPost con asistente.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}

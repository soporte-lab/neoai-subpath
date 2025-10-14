import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";
import SsoBootstrap from "./SsoBootstrap"; // 👈 importa el bootstrap SSO

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cargamos Oswald y lo exponemos como variable CSS
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "NeoRejuvenAI",
  description: "Asistente de IA para NeoRejuvenation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* ✅ Muy importante para móviles y safe areas */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} antialiased bg-neutral-950 text-neutral-100`}
      >
        <SsoBootstrap /> {/* 👈 guarda ?sso= en localStorage y limpia la URL */}
        {children}
      </body>
    </html>
  );
}

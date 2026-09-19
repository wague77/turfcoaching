import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "TURF COACHING SYSTEM - Assistant d'Analyse Turf & Pronostics",
  description: "Plateforme d'analyse hippique avancée, pronostics turf, WAGUE-TURF et coaching de gestion de bankroll.",
  keywords: ["turf", "pronostics", "pmu", "chevaux", "hippisme", "turf coaching", "wague turf"],
  authors: [{ name: "Turf Coaching System" }],
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#13141c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground font-outfit antialiased selection:bg-primary/30 selection:text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

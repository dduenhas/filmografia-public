import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Filmografia — Catálogo de Filmes",
    template: "%s | Filmografia",
  },
  description:
    "Catálogo pessoal de filmes com busca no TMDB, capas, trailers, onde assistir, favoritos, watchlist e notas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main id="conteudo" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-border/60 py-6 text-center text-sm text-zinc-500">
          <p>
            Filmografia — dados e imagens fornecidos por{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              TMDB
            </a>
            . Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
          </p>
        </footer>
      </body>
    </html>
  );
}

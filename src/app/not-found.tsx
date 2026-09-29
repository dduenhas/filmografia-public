import Link from "next/link";
import { Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Film className="h-12 w-12 text-zinc-600" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-zinc-400">
        O filme ou página que você procura não existe, ou o TMDB está temporariamente indisponível.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Voltar ao catálogo
      </Link>
    </div>
  );
}

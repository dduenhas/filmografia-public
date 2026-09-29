"use client";

import { TriangleAlert } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <TriangleAlert className="h-12 w-12 text-amber-500" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="max-w-md text-sm text-zinc-400">
        Ocorreu um erro inesperado. Tente novamente — se o problema persistir, verifique as configurações de banco de
        dados e das chaves de API.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Tentar novamente
      </button>
    </div>
  );
}

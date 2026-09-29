import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  const pages: (number | "…")[] = [];
  const add = (p: number) => pages.push(p);
  add(1);
  if (page - 2 > 2) pages.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) add(p);
  if (page + 2 < totalPages - 1) pages.push("…");
  if (totalPages > 1) add(totalPages);
  return pages;
}

export function Pagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          aria-label="Página anterior"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-zinc-300 hover:border-accent/50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-zinc-600" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm ${
              p === page
                ? "border-accent bg-accent font-semibold text-black"
                : "border-border bg-surface text-zinc-300 hover:border-accent/50"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          aria-label="Próxima página"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-zinc-300 hover:border-accent/50"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

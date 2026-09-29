"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

const FILTER_KEYS = ["tab", "q", "genres", "countries", "yearFrom", "yearTo", "cast", "director", "company"] as const;

type Format = "csv" | "pdf";
type Scope = "filtered" | "full";

/** Botão único de exportação com dropdown: escolhe o formato (CSV ou PDF) e o escopo. */
export function ReportButton() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function filteredQuery(): string {
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((k) => {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    });
    return params.toString();
  }

  async function download(format: Format, scope: Scope) {
    setOpen(false);
    setBusy(`${format}:${scope}`);
    setError(null);
    try {
      const params = new URLSearchParams(scope === "filtered" ? filteredQuery() : "");
      params.set("format", format);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao gerar o relatório");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `relatorio-filmografia-${new Date().toISOString().slice(0, 10)}.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const hasFilters = FILTER_KEYS.some((k) => (k === "tab" ? searchParams.get(k) && searchParams.get(k) !== "all" : Boolean(searchParams.get(k))));

  const item =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-surface-2 disabled:opacity-60";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Exporta o catálogo (ou o resultado dos filtros) em CSV ou PDF"
        className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {busy !== null ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        Exportar relatório
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-xl shadow-black/40">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {hasFilters ? "Resultado dos filtros atuais" : "Catálogo completo"}
            </p>
            <button type="button" role="menuitem" disabled={busy !== null} onClick={() => download("csv", "filtered")} className={item}>
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                CSV <span className="text-zinc-500">— planilha (Excel/Sheets)</span>
              </span>
            </button>
            <button type="button" role="menuitem" disabled={busy !== null} onClick={() => download("pdf", "filtered")} className={item}>
              <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                PDF <span className="text-zinc-500">— formatado para leitura/impressão</span>
              </span>
            </button>

            {hasFilters && (
              <>
                <div className="my-1 border-t border-border/60" />
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Catálogo completo (ignora filtros)</p>
                <button type="button" role="menuitem" disabled={busy !== null} onClick={() => download("csv", "full")} className={item}>
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                  <span>CSV completo</span>
                </button>
                <button type="button" role="menuitem" disabled={busy !== null} onClick={() => download("pdf", "full")} className={item}>
                  <FileText className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                  <span>PDF completo</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

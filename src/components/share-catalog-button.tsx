"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Link2Off, Loader2, Share2, X } from "lucide-react";

interface Props {
  catalogId: string;
}

/** Botão de compartilhar: gera/exibe o link público somente-leitura do catálogo. */
export function ShareCatalogButton({ catalogId }: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${catalogId}/share`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao carregar o link");
      const data = await res.json();
      setToken(data.token ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  useEffect(() => {
    if (open && token === null && !loading && !error) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function activate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${catalogId}/share`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao gerar o link");
      const data = await res.json();
      setToken(data.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${catalogId}/share`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao desativar o link");
      setToken(null);
      setCopied(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!token) return;
    const url = `${window.location.origin}/c/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione e copie o link.");
    }
  }

  const publicUrl = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${token}` : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Compartilhar catálogo (link público somente leitura)"
        aria-label="Compartilhar catálogo"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm text-zinc-300 transition hover:border-accent/50 hover:text-accent"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Compartilhar</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-compartilhar">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/60">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="titulo-compartilhar" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Compartilhar catálogo
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-full p-1 text-zinc-400 transition hover:text-foreground">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mb-4 text-sm text-zinc-400">
              Gere um link público para que qualquer pessoa <strong className="text-zinc-200">visualize</strong> este catálogo
              (pesquisa, filtros e páginas de detalhes), <strong className="text-zinc-200">sem poder editar</strong> e sem acesso à busca em APIs externas.
            </p>

            {loading && (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando…
              </p>
            )}

            {!loading && error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}

            {!loading && !token && !error && (
              <button
                type="button"
                onClick={activate}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" /> Gerar link público
              </button>
            )}

            {!loading && token && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={publicUrl}
                    onFocus={(e) => e.target.select()}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-zinc-300 focus:border-accent/60"
                  />
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-black"
                  >
                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Qualquer pessoa com este link vê o catálogo em modo somente leitura.
                </p>
                <button
                  type="button"
                  onClick={revoke}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-zinc-300 transition hover:border-red-500/50 hover:text-red-400"
                >
                  <Link2Off className="h-4 w-4" aria-hidden="true" /> Desativar link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface Props {
  id: string;
  label: string;
  /** Opções já ordenadas alfabeticamente no servidor. */
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * Lista multiseleção com busca — usada para países (e outros valores que podem ser muitos).
 * Mantém a ordem alfabética recebida e filtra sem diferenciar maiúsculas/acentos visualmente.
 */
export function MultiSelect({ id, label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? options.filter((o) => o.toLowerCase().includes(f)) : options;
  }, [options, filter]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
        {selected.length > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-black">{selected.length}</span>}
      </legend>

      {/* seleções atuais (removíveis) */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-black"
              aria-label={`Remover ${s}`}
            >
              {s}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={() => onChange([])} className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:text-red-400">
            limpar
          </button>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition hover:border-accent/50"
        >
          <span className="text-zinc-300">
            {selected.length > 0 ? `${selected.length} selecionado${selected.length > 1 ? "s" : ""}` : `Selecionar ${label.toLowerCase()}…`}
          </span>
          <ChevronDown className={`h-4 w-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <input
                autoFocus
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                placeholder={`Buscar ${label.toLowerCase()}…`}
                aria-label={`Buscar ${label}`}
                className="w-full bg-transparent text-sm placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <ul id={`${id}-listbox`} role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">Nenhum resultado.</li>}
              {filtered.map((option) => {
                const active = selected.includes(option);
                return (
                  <li key={option} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => toggle(option)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${active ? "border-accent bg-accent text-black" : "border-border"}`}>
                        {active && <Check className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <span className="truncate">{option}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-foreground">
                Fechar
              </button>
              <span className="text-[11px] text-zinc-600">{options.length} opções</span>
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}

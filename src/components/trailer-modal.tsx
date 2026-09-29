"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

interface VideoItem {
  key: string;
  name: string;
  type: string;
}

interface Props {
  videos: VideoItem[];
  title: string;
}

/** Botão + modal de trailer/vídeos incorporados do YouTube (modo sem cookies). */
export function TrailerModal({ videos, title }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<VideoItem | null>(videos[0] ?? null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (videos.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        Assistir trailer
      </button>

      {open && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Trailer: ${title}`}
            tabIndex={-1}
            className="w-full max-w-4xl outline-none"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="truncate text-sm font-medium text-zinc-200">{current.name}</p>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar trailer"
                className="rounded-full bg-surface p-2 text-zinc-300 transition hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                key={current.key}
                src={`https://www.youtube-nocookie.com/embed/${current.key}?autoplay=1&rel=0`}
                title={current.name}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full"
              />
            </div>

            {videos.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Outros vídeos">
                {videos.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    role="listitem"
                    onClick={() => setCurrent(v)}
                    aria-current={v.key === current.key}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      v.key === current.key
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface text-zinc-400 hover:text-foreground"
                    }`}
                  >
                    {v.type === "Trailer" ? "Trailer" : v.type === "Teaser" ? "Teaser" : v.type} · {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

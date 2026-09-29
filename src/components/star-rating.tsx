"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  value: number | null; // 0–10
  onChange: (value: number | null) => void;
  disabled?: boolean;
  id?: string;
}

/** Avaliação pessoal em 5 estrelas (cada estrela = 2 pontos, escala 0–10). */
export function StarRating({ value, onChange, disabled = false, id }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = (hover ?? value ?? 0) / 2;

  return (
    <div className="flex items-center gap-2">
      <div
        id={id}
        role="radiogroup"
        aria-label="Sua nota (0 a 10)"
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(shown);
          const starValue = star * 2;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              aria-label={`${starValue} de 10`}
              disabled={disabled}
              onMouseEnter={() => setHover(starValue)}
              onFocus={() => setHover(starValue)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(value === starValue ? null : starValue)}
              className="rounded p-0.5 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Star
                className={`h-5 w-5 transition ${filled ? "fill-accent text-accent" : "text-zinc-600 hover:text-zinc-400"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <span className="min-w-8 text-sm font-medium text-accent" aria-live="polite">
        {value !== null ? `${value}/10` : "—"}
      </span>
    </div>
  );
}

// Rate limiting simples em memória (janela deslizante).
// Na Vercel (serverless) a proteção é "melhor esforço" por instância —
// suficiente para um catálogo pessoal/pública de baixo tráfego.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30; // por IP por janela

export function rateLimit(key: string, limit = MAX_REQUESTS): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec: Math.ceil((oldest + WINDOW_MS - now) / 1000) };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  // higiene: evita crescimento infinito do Map
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.timestamps.every((t) => now - t >= WINDOW_MS)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

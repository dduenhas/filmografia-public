import Image, { type ImageProps } from "next/image";

/**
 * Wrapper de next/image que lida com as duas origens de imagem do catálogo:
 * - TMDB (image.tmdb.org): passa pelo otimizador do Next (remotePatterns).
 * - Cadastro manual (URL externa arbitrária): usa `unoptimized` para dispensar
 *   o otimizador, já que não é possível prever o host em remotePatterns.
 */
export function CatalogImage({ src, ...props }: ImageProps) {
  const absolute = typeof src === "string" && /^https?:\/\//i.test(src);
  const isTmdb = absolute && src.includes("image.tmdb.org");
  return <Image src={src} {...props} unoptimized={absolute && !isTmdb} />;
}

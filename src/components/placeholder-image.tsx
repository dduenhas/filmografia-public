import Image, { type ImageProps } from "next/image";

/**
 * Placeholders exibidos quando um filme não tem imagem — comum em cadastros
 * manuais sem capa/fundo informados. As imagens ficam em um host externo
 * (mediarepo.vercel.app); usamos `unoptimized` para dispensar o otimizador do
 * Next, que exigiria configurar `remotePatterns` para esse domínio.
 */
export const POSTER_PLACEHOLDER =
  "https://mediarepo.vercel.app/api/v/93c5f0b8-5a4f-4629-9796-8255f815b85a.webp";
export const BACKDROP_PLACEHOLDER =
  "https://mediarepo.vercel.app/api/v/bcb3a658-9c27-4d0b-863a-54704d7ee771.webp";

type Props = Omit<ImageProps, "src"> & { variant: "poster" | "backdrop" };

export function PlaceholderImage({ variant, alt = "", ...props }: Props) {
  return (
    <Image
      src={variant === "poster" ? POSTER_PLACEHOLDER : BACKDROP_PLACEHOLDER}
      alt={alt}
      unoptimized
      {...props}
    />
  );
}

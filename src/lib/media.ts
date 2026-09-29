// Tipos de mídia suportados para a cópia catalogada (localização física).
// "Digital" é o único que habilita o campo de URL da cópia.

export const MEDIA_TYPES = ["DVD", "VHS", "VCD", "CD", "DVD-R", "8MM", "BetaMax", "Digital"] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

/** true quando o tipo de mídia exige/permite informar a URL da cópia. */
export function mediaUsesUrl(mediaType: string | null | undefined): boolean {
  return mediaType === "Digital";
}

import { z } from "zod";
import { MEDIA_TYPES } from "@/lib/media";

// ---------- Schemas de validação de entrada ----------

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  page: z.coerce.number().int().min(1).max(50).default(1),
});

const csvList = z
  .string()
  .default("")
  .transform((s) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 12),
  );

export const catalogQuerySchema = z.object({
  tab: z.enum(["all", "favorites", "watchlist", "watched"]).default("all"),
  q: z.string().trim().max(80).optional().default(""),
  genres: csvList,
  countries: csvList,
  yearFrom: z.coerce.number().int().min(1870).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1870).max(2100).optional(),
  cast: z.string().trim().max(120).optional().default(""),
  director: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  mediaType: z.union([z.enum(MEDIA_TYPES), z.literal("")]).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  shelf: z.string().trim().max(120).optional().default(""),
  sort: z
    .enum(["recent", "title", "rating", "personal", "release_desc", "release_asc", "runtime"])
    .default("recent"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type CatalogFilters = Omit<z.infer<typeof catalogQuerySchema>, "page" | "sort"> & {
  sort: z.infer<typeof catalogQuerySchema>["sort"];
};

export const importMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
});

// ---------- Cadastro manual de filme ----------

/** Campo opcional de texto que vira null quando vazio. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

/** URL http(s) opcional que vira null quando vazia. */
const optionalUrl = z
  .string()
  .trim()
  .max(600)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      const u = new URL(v);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      return u.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "URL inválida (use http/https)" });
      return z.NEVER;
    }
  });

/** URL http(s) que preserva `undefined` (ausente = não altera); vazio/null → null. */
const optionalUrlKeepAbsent = z
  .string()
  .trim()
  .max(600)
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    try {
      const u = new URL(v);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      return u.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "URL inválida (use http/https)" });
      return z.NEVER;
    }
  });

/** Lista de nomes aceita como array ou texto separado por vírgula/quebra de linha. */
const nameList = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((v) => {
    const raw = Array.isArray(v) ? v : (v ?? "").split(/[\n,;]/);
    return raw
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);
  });

/** Filme inserido manualmente (fora dos catálogos oficiais TMDB). */
export const manualMovieSchema = z.object({
  title: z.string().trim().min(1).max(200),
  originalTitle: optionalText(200),
  overview: optionalText(4000),
  tagline: optionalText(300),
  posterUrl: optionalUrl,
  backdropUrl: optionalUrl,
  trailerUrl: optionalUrl,
  homepage: optionalUrl,
  imdbId: optionalText(20),
  releaseDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  runtime: z.coerce.number().int().min(0).max(1000).optional(),
  genres: nameList,
  countries: nameList,
  cast: nameList,
  productionCompanies: nameList,
  director: optionalText(160),
  voteAverage: z.coerce.number().min(0).max(10).optional(),
  // localização física da obra (tudo opcional)
  location: optionalText(120),
  shelf: optionalText(120),
  rack: optionalText(120),
  numbering: optionalText(60),
  mediaType: z
    .union([z.enum(MEDIA_TYPES), z.literal("")])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
  mediaUrl: optionalUrl,
});

export type ManualMovieInput = z.infer<typeof manualMovieSchema>;

/** Edição parcial dos metadados de um filme manual. */
export const updateManualMovieSchema = manualMovieSchema.partial();
export type UpdateManualMovieInput = z.infer<typeof updateManualMovieSchema>;

// ---------- Catálogos ----------

export const createCatalogSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const renameCatalogSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateMovieSchema = z.object({
  favorite: z.boolean().optional(),
  watchlist: z.boolean().optional(),
  watched: z.boolean().optional(),
  personalRating: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  watchedAt: z.string().datetime().nullable().optional(),
  // localização física da obra (tudo opcional); ausente = não altera
  location: z.string().trim().max(120).nullable().optional(),
  shelf: z.string().trim().max(120).nullable().optional(),
  rack: z.string().trim().max(120).nullable().optional(),
  numbering: z.string().trim().max(60).nullable().optional(),
  mediaType: z
    .union([z.enum(MEDIA_TYPES), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  mediaUrl: optionalUrlKeepAbsent,
});

// ---------- Autenticação ----------

export const loginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

export const bootstrapSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.email().max(200),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(["ADMIN", "COLLABORATOR", "MEMBER"]).default("COLLABORATOR"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["ADMIN", "COLLABORATOR", "MEMBER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

export type ImportMovieInput = z.infer<typeof importMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "imdbId" TEXT,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "tagline" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "releaseDate" TIMESTAMP(3),
    "runtime" INTEGER,
    "genres" TEXT[],
    "voteAverage" DOUBLE PRECISION,
    "popularity" DOUBLE PRECISION,
    "trailerKey" TEXT,
    "director" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "watchlist" BOOLEAN NOT NULL DEFAULT false,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "personalRating" DOUBLE PRECISION,
    "notes" TEXT,
    "watchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_title_idx" ON "Movie"("title");

-- CreateIndex
CREATE INDEX "Movie_favorite_idx" ON "Movie"("favorite");

-- CreateIndex
CREATE INDEX "Movie_watchlist_idx" ON "Movie"("watchlist");

-- CreateIndex
CREATE INDEX "Movie_watched_idx" ON "Movie"("watched");

-- CreateIndex
CREATE INDEX "Movie_createdAt_idx" ON "Movie"("createdAt");

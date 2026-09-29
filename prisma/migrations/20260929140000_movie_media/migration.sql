-- Tipo de mídia da cópia física e URL da cópia digital (opcionais).
ALTER TABLE "Movie" ADD COLUMN "mediaType" TEXT;
ALTER TABLE "Movie" ADD COLUMN "mediaUrl" TEXT;

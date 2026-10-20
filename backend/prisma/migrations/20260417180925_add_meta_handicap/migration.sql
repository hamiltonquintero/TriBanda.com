-- AlterTable
ALTER TABLE "Partida" ADD COLUMN     "meta_a" INTEGER,
ADD COLUMN     "meta_b" INTEGER;

-- AlterTable
ALTER TABLE "Torneo" ADD COLUMN     "meta_base" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "InscripcionTorneo" (
    "id" TEXT NOT NULL,
    "torneo_id" TEXT NOT NULL,
    "jugador_id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL DEFAULT 'segunda',
    "meta_puntos" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscripcionTorneo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InscripcionTorneo_torneo_id_jugador_id_key" ON "InscripcionTorneo"("torneo_id", "jugador_id");

-- AddForeignKey
ALTER TABLE "InscripcionTorneo" ADD CONSTRAINT "InscripcionTorneo_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionTorneo" ADD CONSTRAINT "InscripcionTorneo_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

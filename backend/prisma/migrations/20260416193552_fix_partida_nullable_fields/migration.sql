-- DropForeignKey
ALTER TABLE "Partida" DROP CONSTRAINT "Partida_juez_id_fkey";

-- AlterTable
ALTER TABLE "Partida" ADD COLUMN     "total_sets" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "fecha" DROP NOT NULL,
ALTER COLUMN "juez_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_juez_id_fkey" FOREIGN KEY ("juez_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

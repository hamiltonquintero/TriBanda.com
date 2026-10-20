-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'juez', 'jugador', 'espectador');

-- CreateEnum
CREATE TYPE "EstadoTorneo" AS ENUM ('borrador', 'activo', 'finalizado');

-- CreateEnum
CREATE TYPE "TipoFase" AS ENUM ('grupos', 'clasificatorio', 'llaves', 'final');

-- CreateEnum
CREATE TYPE "EstadoPartida" AS ENUM ('pendiente', 'en_curso', 'finalizada');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'espectador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jugador_id" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "alias" TEXT,
    "cedula" TEXT,
    "celular" TEXT,
    "ciudad" TEXT,
    "pais" TEXT DEFAULT 'Colombia',
    "club_ciudad" TEXT NOT NULL,
    "categoria" TEXT,
    "foto_url" TEXT,
    "promedio_historico" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "club_id" TEXT,

    CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Torneo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "sede" TEXT NOT NULL,
    "estado" "EstadoTorneo" NOT NULL DEFAULT 'borrador',
    "incremento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fase" (
    "id" TEXT NOT NULL,
    "tipo" "TipoFase" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "orden" INTEGER NOT NULL,
    "torneo_id" TEXT NOT NULL,

    CONSTRAINT "Fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "letra" TEXT,
    "fase_id" TEXT NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoJugador" (
    "grupo_id" TEXT NOT NULL,
    "jugador_id" TEXT NOT NULL,

    CONSTRAINT "GrupoJugador_pkey" PRIMARY KEY ("grupo_id","jugador_id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "estado" "EstadoPartida" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fase_id" TEXT NOT NULL,
    "grupo_id" TEXT,
    "jugador_a_id" TEXT NOT NULL,
    "jugador_b_id" TEXT NOT NULL,
    "juez_id" TEXT NOT NULL,
    "ganador_id" TEXT,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "partida_id" TEXT NOT NULL,
    "ganador_id" TEXT,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntradaSet" (
    "id" TEXT NOT NULL,
    "numero_entrada" INTEGER NOT NULL,
    "carambolas" INTEGER NOT NULL DEFAULT 0,
    "set_id" TEXT NOT NULL,
    "jugador_id" TEXT NOT NULL,

    CONSTRAINT "EntradaSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "puntos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sets_ganados" INTEGER NOT NULL DEFAULT 0,
    "sets_perdidos" INTEGER NOT NULL DEFAULT 0,
    "carambolas_total" INTEGER NOT NULL DEFAULT 0,
    "entradas_total" INTEGER NOT NULL DEFAULT 0,
    "promedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "puntos_ranking" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posicion" INTEGER NOT NULL DEFAULT 0,
    "torneo_id" TEXT NOT NULL,
    "jugador_id" TEXT NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketSlot" (
    "id" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL,
    "posicion" INTEGER NOT NULL,
    "fase_id" TEXT NOT NULL,
    "jugador_id" TEXT,
    "partida_id" TEXT,

    CONSTRAINT "BracketSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_jugador_id_key" ON "Usuario"("jugador_id");

-- CreateIndex
CREATE UNIQUE INDEX "Club_nombre_key" ON "Club"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_nombre_completo_key" ON "Jugador"("nombre_completo");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_cedula_key" ON "Jugador"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_torneo_id_jugador_id_key" ON "Ranking"("torneo_id", "jugador_id");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fase" ADD CONSTRAINT "Fase_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "Fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoJugador" ADD CONSTRAINT "GrupoJugador_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoJugador" ADD CONSTRAINT "GrupoJugador_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "Fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_jugador_a_id_fkey" FOREIGN KEY ("jugador_a_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_jugador_b_id_fkey" FOREIGN KEY ("jugador_b_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_juez_id_fkey" FOREIGN KEY ("juez_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_ganador_id_fkey" FOREIGN KEY ("ganador_id") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_ganador_id_fkey" FOREIGN KEY ("ganador_id") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaSet" ADD CONSTRAINT "EntradaSet_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaSet" ADD CONSTRAINT "EntradaSet_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "Fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketSlot" ADD CONSTRAINT "BracketSlot_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

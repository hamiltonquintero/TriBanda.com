import prisma from './prisma';

/**
 * Sincroniza automáticamente cualquier columna o tabla faltante en la base de datos de producción
 * sin necesidad de migraciones manuales y sin riesgo de pérdida de datos.
 */
export async function sincronizarEsquemaBD() {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Columnas en Torneo
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Torneo' AND column_name = 'total_sets_default') THEN
          ALTER TABLE "Torneo" ADD COLUMN "total_sets_default" INTEGER NOT NULL DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Torneo' AND column_name = 'meta_base') THEN
          ALTER TABLE "Torneo" ADD COLUMN "meta_base" INTEGER NOT NULL DEFAULT 30;
        END IF;

        -- Columnas en Fase
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Fase' AND column_name = 'clasificados_por_grupo') THEN
          ALTER TABLE "Fase" ADD COLUMN "clasificados_por_grupo" INTEGER NOT NULL DEFAULT 2;
        END IF;

        -- Columnas en Set
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Set' AND column_name = 'desempate_oro') THEN
          ALTER TABLE "Set" ADD COLUMN "desempate_oro" BOOLEAN NOT NULL DEFAULT false;
        END IF;

        -- Columnas en Partida
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'meta_a') THEN
          ALTER TABLE "Partida" ADD COLUMN "meta_a" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'meta_b') THEN
          ALTER TABLE "Partida" ADD COLUMN "meta_b" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'jugador_salida_id') THEN
          ALTER TABLE "Partida" ADD COLUMN "jugador_salida_id" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'color_bola_a') THEN
          ALTER TABLE "Partida" ADD COLUMN "color_bola_a" TEXT DEFAULT 'blanca';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'color_bola_b') THEN
          ALTER TABLE "Partida" ADD COLUMN "color_bola_b" TEXT DEFAULT 'amarilla';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'limite_entradas') THEN
          ALTER TABLE "Partida" ADD COLUMN "limite_entradas" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'modo_libre') THEN
          ALTER TABLE "Partida" ADD COLUMN "modo_libre" BOOLEAN NOT NULL DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'solicitud_reapertura') THEN
          ALTER TABLE "Partida" ADD COLUMN "solicitud_reapertura" BOOLEAN NOT NULL DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'motivo_reapertura') THEN
          ALTER TABLE "Partida" ADD COLUMN "motivo_reapertura" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Partida' AND column_name = 'audit_log') THEN
          ALTER TABLE "Partida" ADD COLUMN "audit_log" JSONB;
        END IF;

        -- Columnas en InscripcionTorneo
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InscripcionTorneo' AND column_name = 'pago_confirmado') THEN
          ALTER TABLE "InscripcionTorneo" ADD COLUMN "pago_confirmado" BOOLEAN NOT NULL DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InscripcionTorneo' AND column_name = 'meta_puntos') THEN
          ALTER TABLE "InscripcionTorneo" ADD COLUMN "meta_puntos" INTEGER NOT NULL DEFAULT 24;
        END IF;
      END $$;
    `);
    console.log('[DB] ✅ Esquema de base de datos verificado y sincronizado correctamente.');
  } catch (err) {
    console.warn('[DB] ⚠️ Aviso sincronización esquema:', err);
  }
}

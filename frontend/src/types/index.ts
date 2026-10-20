export type Rol = 'admin' | 'juez' | 'jugador' | 'espectador';
export type EstadoTorneo = 'borrador' | 'activo' | 'finalizado';
export type TipoFase = 'grupos' | 'clasificatorio' | 'llaves' | 'final';
export type EstadoPartida = 'pendiente' | 'en_curso' | 'finalizada';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Club {
  id: string;
  nombre: string;
  ciudad?: string;
}

export interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  alias?: string;
  cedula?: string;
  celular?: string;
  ciudad?: string;
  pais?: string;
  club_ciudad: string;
  categoria?: string;
  foto_url?: string;
  promedio_historico: number;
  activo: boolean;
  club?: Club;
}

export interface JugadorConHistorial extends Jugador {
  rankings: {
    torneo_id: string;
    posicion: number;
    puntos: number;
    promedio: number;
    promedio_particular?: number;
    mayor_serie?: number;
    puntos_ranking: number;
    torneo: { id: string; nombre: string; fecha_inicio: string; estado: EstadoTorneo };
  }[];
}

export interface Fase {
  id: string;
  tipo: TipoFase;
  fecha: string;
  orden: number;
  torneo_id: string;
  clasificados_por_grupo?: number;
  torneo?: Torneo;
}

export interface Torneo {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  sede: string;
  estado: EstadoTorneo;
  incremento: number;
  meta_base?: number;
  modalidad?: 'profesional' | 'local' | 'relampago';
  distancia_relampago?: 'corto' | 'largo' | null;
  limite_entradas?: number | null;
  modo_libre?: boolean;
  total_sets_default?: number;
  fases?: Fase[];
}

// ─── GRUPOS ──────────────────────────────────────────────────────────────────

export interface FilaTabla {
  posicion: number;
  jugador_id: string;
  nombre_completo: string;
  club: string;
  puntos: number;
  sets_ganados: number;
  sets_perdidos: number;
  carambolas: number;
  entradas: number;
  promedio: number;
  promedio_particular?: number;
  mayor_serie?: number;
}

export interface GrupoJugador {
  grupo_id: string;
  jugador_id: string;
  jugador: Jugador;
}

export interface Grupo {
  id: string;
  numero: number;
  letra?: string;
  fase_id: string;
  jugadores: GrupoJugador[];
  tabla?: FilaTabla[];
  partidas?: Partida[];
}

export interface FilaGeneralClasificado extends FilaTabla {
  grupo_id: string;
  grupo_numero: number;
  grupo_letra?: string;
  posicion_en_grupo: number;
  siembra_general: number;
}

export interface InfoClasificados {
  fase_id: string;
  clasificados_por_grupo: number;
  total_clasificados: number;
  grupos: {
    grupo_id: string;
    grupo_numero: number;
    grupo_letra?: string;
    tabla: FilaTabla[];
    clasificados: FilaGeneralClasificado[];
  }[];
  tabla_general: FilaGeneralClasificado[];
  esquema_ajuste: {
    total_clasificados: number;
    potencia_objetivo: number;
    sobrantes: number;
    clasificados_directos_count: number;
    juegan_ajuste_count: number;
    clasificados_directos: FilaGeneralClasificado[];
    participantes_ajuste: FilaGeneralClasificado[];
    cruces_ajuste: { match_num: number; jugador_a: FilaGeneralClasificado; jugador_b: FilaGeneralClasificado }[];
  };
}

// ─── PARTIDAS ────────────────────────────────────────────────────────────────

export interface EntradaSet {
  id: string;
  numero_entrada: number;
  carambolas: number;
  jugador_id: string;
  set_id: string;
}

export interface SetPartida {
  id: string;
  numero: number;
  partida_id: string;
  ganador_id?: string;
  ganador?: Jugador;
  entradas: EntradaSet[];
}

export interface Partida {
  id: string;
  fecha: string | null;
  hora?: string;
  estado: EstadoPartida;
  confirmada: boolean;
  bloqueada?: boolean;
  solicitud_reapertura?: boolean;
  motivo_reapertura?: string;
  audit_log?: any[];
  meta_a?: number | null;
  meta_b?: number | null;
  jugador_salida_id?: string | null;
  color_bola_a?: string | null;
  color_bola_b?: string | null;
  limite_entradas?: number | null;
  modo_libre?: boolean;
  fase_id: string;
  grupo_id?: string;
  jugador_a_id: string;
  jugador_b_id: string;
  juez_id?: string;
  ganador_id?: string;
  jugador_a: Jugador;
  jugador_b: Jugador;
  juez?: { id: string; nombre: string; email: string } | null;
  ganador?: Jugador;
  fase?: Fase;
  grupo?: Grupo;
  sets: SetPartida[];
}

// ─── PLANILLA ────────────────────────────────────────────────────────────────

export interface FilaPlanilla {
  numero_entrada: number;
  carambolas_a: number | null;
  total_a: number | null;
  carambolas_b: number | null;
  total_b: number | null;
}

export interface SetPlanilla {
  id?: string;
  numero: number;
  ganador_id?: string;
  ganador?: Jugador;
  filas: FilaPlanilla[];
  total_carambolas_a: number;
  total_carambolas_b: number;
}

export interface ResumenPlanilla {
  total_carambolas_a: number;
  total_carambolas_b: number;
  total_entradas_a: number;
  total_entradas_b: number;
  sets_ganados_a: number;
  sets_ganados_b: number;
  promedio_a: number;
  promedio_b: number;
}

export interface Planilla {
  encabezado: {
    jugador_a: Jugador;
    jugador_b: Jugador;
    juez?: { id: string; nombre: string; email: string } | null;
    fecha: string | null;
    fase: Fase;
    jugador_salida_id?: string | null;
    color_bola_a?: string | null;
    color_bola_b?: string | null;
    meta_a?: number | null;
    meta_b?: number | null;
    limite_entradas?: number | null;
    modo_libre?: boolean;
  };
  estado: EstadoPartida;
  confirmada: boolean;
  bloqueada?: boolean;
  solicitud_reapertura?: boolean;
  motivo_reapertura?: string;
  total_sets?: number;
  ganador?: Jugador;
  sets: SetPlanilla[];
  resumen: ResumenPlanilla;
}

export interface RankingItem {
  posicion: number;
  jugador_id: string;
  nombre_completo: string;
  alias?: string;
  club_ciudad: string;
  puntos: number;
  sets_ganados: number;
  sets_perdidos: number;
  carambolas_total: number;
  entradas_total: number;
  promedio: number;
  promedio_particular?: number;
  mayor_serie?: number;
  puntos_ranking: number;
}

export interface BracketSlotItem {
  id?: string;
  ronda?: number;
  posicion?: number;
  es_ajuste?: boolean;
  semilla?: number;
  jugador_id?: string | null;
  jugador?: Jugador | null;
  partida_id?: string | null;
  partida?: Partida;
}

export interface BracketCruce {
  slot_a: BracketSlotItem;
  slot_b: BracketSlotItem;
}

export interface BracketRonda {
  numero: number;
  nombre: string;
  es_ajuste?: boolean;
  cruces: BracketCruce[];
}

export interface BracketData {
  fase_id?: string;
  tamano?: number;
  rondas: BracketRonda[];
  campeon?: Jugador | null;
  subcampeon?: Jugador | null;
}

export interface InscripcionTorneo {
  id: string;
  torneo_id: string;
  jugador_id: string;
  nivel: string;
  meta_puntos: number;
  pago_confirmado: boolean;
  created_at: string;
  jugador: Jugador;
}


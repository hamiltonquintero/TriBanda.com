import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface MarcadorSet {
  numero: number;
  ganador_id?: string | null;
  desempate_oro?: boolean;
  es_empate?: boolean;
  jugador_salida_id?: string;
  turno_jugador_id?: string;
  limite_entradas_alcanzado?: boolean;
  carambolas_a: number;
  carambolas_b: number;
  entradas_a: number;
  entradas_b: number;
}

interface MarcadorData {
  partida_id: string;
  estado: string;
  total_sets: number;
  confirmada: boolean;
  meta_a?: number;
  meta_b?: number;
  jugador_salida_id?: string | null;
  color_bola_a?: string | null;
  color_bola_b?: string | null;
  limite_entradas?: number | null;
  modo_libre?: boolean;
  jugador_a: { id: string; nombre_completo: string; alias?: string; foto_url?: string };
  jugador_b: { id: string; nombre_completo: string; alias?: string; foto_url?: string };
  juez?: { id: string; nombre: string; email?: string } | null;
  ganador?: { id: string; nombre_completo: string };
  sets: MarcadorSet[];
  resumen: {
    carambolas_a: number; carambolas_b: number;
    entradas_a: number; entradas_b: number;
    sets_ganados_a: number; sets_ganados_b: number;
    promedio_a: number; promedio_b: number;
  };
}

export default function MarcadorPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [setActivo, setSetActivo] = useState(1);
  const [mostrarModalInicio, setMostrarModalInicio] = useState(false);
  const [modalCambiarJuez, setModalCambiarJuez] = useState(false);
  const [modalDesempateOro, setModalDesempateOro] = useState(false);

  // Estados para el protocolo previo de inicio
  const [salidaJugadorId, setSalidaJugadorId] = useState<string>('');
  const [bolaA, setBolaA] = useState<'blanca' | 'amarilla' | 'azul'>('blanca');
  const [bolaB, setBolaB] = useState<'blanca' | 'amarilla' | 'azul'>('amarilla');
  const [handicapA, setHandicapA] = useState<number>(30);
  const [handicapB, setHandicapB] = useState<number>(30);
  const [esModoLibre, setEsModoLibre] = useState<boolean>(false);
  const [limiteEntradas, setLimiteEntradas] = useState<number>(25);
  const [juezId, setJuezId] = useState<string>('');
  const [juezNombre, setJuezNombre] = useState<string>('');

  const { data: marcador, isLoading } = useQuery<MarcadorData>({
    queryKey: ['marcador', id],
    queryFn: () => api.get(`/partidas/marcador/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.estado === 'finalizada' || data.confirmada) return false;
      return 5000;
    },
    refetchIntervalInBackground: false,
    staleTime: 3000,
  });

  // Auto-seleccionar el set activo (primer set incompleto) cuando la partida está en juego
  useEffect(() => {
    if (marcador && marcador.estado === 'en_curso') {
      const setIncompleto = marcador.sets.find((s) => !s.ganador_id);
      if (setIncompleto && setIncompleto.numero !== setActivo) {
        setSetActivo(setIncompleto.numero);
      }
    }
  }, [marcador?.sets, marcador?.estado]);

  const { data: listaJueces = [] } = useQuery<{ id: string; nombre: string; rol?: string }[]>({
    queryKey: ['usuarios-jueces'],
    queryFn: () => api.get('/auth/usuarios').then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    enabled: hasRole('admin', 'juez'),
    staleTime: 60000,
  });

  const iniciar = useMutation({
    mutationFn: (protocoloData: any) => api.patch(`/partidas/${id}/iniciar`, protocoloData),
    onSuccess: () => {
      setMostrarModalInicio(false);
      qc.invalidateQueries({ queryKey: ['marcador', id] });
      qc.invalidateQueries({ queryKey: ['planilla', id] });
    },
  });

  const asignarJuezMut = useMutation({
    mutationFn: (data: { juez_id?: string | null; juez_nombre?: string | null }) =>
      api.patch(`/partidas/${id}/asignar-juez`, data),
    onSuccess: () => {
      setModalCambiarJuez(false);
      qc.invalidateQueries({ queryKey: ['marcador', id] });
      qc.invalidateQueries({ queryKey: ['planilla', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al asignar juez');
    },
  });

  function abrirProtocoloInicio() {
    if (marcador) {
      setSalidaJugadorId(marcador.jugador_salida_id || marcador.jugador_a.id);
      setBolaA((marcador.color_bola_a as any) || 'blanca');
      setBolaB((marcador.color_bola_b as any) || 'amarilla');
      setHandicapA(marcador.meta_a || 30);
      setHandicapB(marcador.meta_b || 30);
      setEsModoLibre(!!marcador.modo_libre);
      setLimiteEntradas(marcador.limite_entradas || 25);
      setJuezId(marcador.juez?.id || '');
      setJuezNombre(marcador.juez?.nombre || '');
    }
    setMostrarModalInicio(true);
  }

  function alternarColoresBola() {
    setBolaA(bolaB);
    setBolaB(bolaA);
  }

  function handleConfirmarInicio() {
    iniciar.mutate({
      jugador_salida_id: salidaJugadorId,
      color_bola_a: bolaA,
      color_bola_b: bolaB,
      meta_a: Number(handicapA),
      meta_b: Number(handicapB),
      modo_libre: esModoLibre,
      limite_entradas: esModoLibre ? null : Number(limiteEntradas),
      juez_id: juezId || null,
      juez_nombre: juezNombre || null,
    });
  }

  const sumar = useMutation({
    mutationFn: (data: { jugador_id: string; set_numero: number }) =>
      api.post(`/partidas/${id}/marcador`, { ...data, accion: 'sumar' }),
    onMutate: async (vars) => {
      // 1. Actualización optimista síncrona inmediata (0ms de retraso táctil)
      const previo = qc.getQueryData<MarcadorData>(['marcador', id]);
      if (previo) {
        const esA = vars.jugador_id === previo.jugador_a.id;
        const sets = previo.sets.map((s) => {
          if (s.numero !== vars.set_numero) return s;
          return {
            ...s,
            carambolas_a: esA ? s.carambolas_a + 1 : s.carambolas_a,
            carambolas_b: !esA ? s.carambolas_b + 1 : s.carambolas_b,
          };
        });

        const totalCarA = sets.reduce((acc, s) => acc + s.carambolas_a, 0);
        const totalCarB = sets.reduce((acc, s) => acc + s.carambolas_b, 0);
        const entA = previo.resumen.entradas_a;
        const entB = previo.resumen.entradas_b;

        const optimistic: MarcadorData = {
          ...previo,
          sets,
          resumen: {
            ...previo.resumen,
            carambolas_a: totalCarA,
            carambolas_b: totalCarB,
            promedio_a: entA > 0 ? Math.round((totalCarA / entA) * 1000) / 1000 : 0,
            promedio_b: entB > 0 ? Math.round((totalCarB / entB) * 1000) / 1000 : 0,
          },
        };

        qc.setQueryData<MarcadorData>(['marcador', id], optimistic);
      }

      // 2. Cancelar consultas en vuelo en segundo plano
      await qc.cancelQueries({ queryKey: ['marcador', id] });
      return { previo };
    },
    onSuccess: (res) => {
      if (res?.data) {
        qc.setQueryData(['marcador', id], res.data);
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previo) {
        qc.setQueryData(['marcador', id], context.previo);
      }
    },
  });

  const restar = useMutation({
    mutationFn: (data: { jugador_id: string; set_numero: number }) =>
      api.post(`/partidas/${id}/marcador`, { ...data, accion: 'restar' }),
    onMutate: async (vars) => {
      // 1. Actualización optimista síncrona inmediata (0ms de retraso táctil)
      const previo = qc.getQueryData<MarcadorData>(['marcador', id]);
      if (previo) {
        const esA = vars.jugador_id === previo.jugador_a.id;
        const sets = previo.sets.map((s) => {
          if (s.numero !== vars.set_numero) return s;
          return {
            ...s,
            carambolas_a: esA ? Math.max(0, s.carambolas_a - 1) : s.carambolas_a,
            carambolas_b: !esA ? Math.max(0, s.carambolas_b - 1) : s.carambolas_b,
          };
        });

        const totalCarA = sets.reduce((acc, s) => acc + s.carambolas_a, 0);
        const totalCarB = sets.reduce((acc, s) => acc + s.carambolas_b, 0);
        const entA = previo.resumen.entradas_a;
        const entB = previo.resumen.entradas_b;

        const optimistic: MarcadorData = {
          ...previo,
          sets,
          resumen: {
            ...previo.resumen,
            carambolas_a: totalCarA,
            carambolas_b: totalCarB,
            promedio_a: entA > 0 ? Math.round((totalCarA / entA) * 1000) / 1000 : 0,
            promedio_b: entB > 0 ? Math.round((totalCarB / entB) * 1000) / 1000 : 0,
          },
        };

        qc.setQueryData<MarcadorData>(['marcador', id], optimistic);
      }

      // 2. Cancelar consultas en vuelo en segundo plano
      await qc.cancelQueries({ queryKey: ['marcador', id] });
      return { previo };
    },
    onSuccess: (res) => {
      if (res?.data) {
        qc.setQueryData(['marcador', id], res.data);
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previo) {
        qc.setQueryData(['marcador', id], context.previo);
      }
    },
  });

  const turno = useMutation({
    mutationFn: (set_numero: number) => api.post(`/partidas/${id}/turno`, { set_numero }),
    onMutate: async (set_numero) => {
      // 1. Actualización optimista síncrona inmediata del turno
      const previo = qc.getQueryData<MarcadorData>(['marcador', id]);
      if (previo) {
        const sets = previo.sets.map((s) => {
          if (s.numero !== set_numero) return s;
          const actualTurno = s.turno_jugador_id || (
            set_numero % 2 === 1
              ? (previo.jugador_salida_id || previo.jugador_a.id)
              : (previo.jugador_salida_id === previo.jugador_a.id ? previo.jugador_b.id : previo.jugador_a.id)
          );
          const nuevoTurno = actualTurno === previo.jugador_a.id ? previo.jugador_b.id : previo.jugador_a.id;
          return {
            ...s,
            turno_jugador_id: nuevoTurno,
          };
        });

        const optimistic: MarcadorData = {
          ...previo,
          sets,
        };

        qc.setQueryData<MarcadorData>(['marcador', id], optimistic);
      }

      // 2. Cancelar consultas en vuelo en segundo plano
      await qc.cancelQueries({ queryKey: ['marcador', id] });
      return { previo };
    },
    onSuccess: (res) => {
      if (res?.data) {
        qc.setQueryData(['marcador', id], res.data);
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previo) {
        qc.setQueryData(['marcador', id], context.previo);
      }
    },
  });

  const desempateOroMut = useMutation({
    mutationFn: (data: { set_numero: number; ganador_id: string }) =>
      api.patch(`/partidas/${id}/set/${data.set_numero}/desempate`, { ganador_id: data.ganador_id }),
    onSuccess: (res) => {
      setModalDesempateOro(false);
      if (res?.data) qc.setQueryData(['marcador', id], res.data);
      else qc.invalidateQueries({ queryKey: ['marcador', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al registrar desempate por Carambola de Oro');
    },
  });

  const finSet = useMutation({
    mutationFn: (set_numero: number) => api.patch(`/partidas/${id}/set/${set_numero}/finalizar`),
    onSuccess: (res) => {
      if (res?.data) qc.setQueryData(['marcador', id], res.data);
      else qc.invalidateQueries({ queryKey: ['marcador', id] });
    },
  });

  const confirmar = useMutation({
    mutationFn: () => api.patch(`/partidas/${id}/confirmar`),
    onSuccess: (res) => {
      if (res?.data) qc.setQueryData(['marcador', id], res.data);
      else qc.invalidateQueries({ queryKey: ['marcador', id] });
      qc.invalidateQueries({ queryKey: ['planilla', id] });
      qc.invalidateQueries({ queryKey: ['partidas'] });
    },
  });

  if (isLoading || !marcador) return <p className="text-gray-500 p-6">Cargando marcador...</p>;

  const { jugador_a, jugador_b, sets, resumen, estado, ganador, confirmada, total_sets } = marcador;
  const meta_a = marcador.meta_a;
  const meta_b = marcador.meta_b;
  const setData = sets.find((s) => s.numero === setActivo);
  const puedeEditar = estado === 'en_curso' && !confirmada && hasRole('admin', 'juez');

  // Alternancia reglamentaria de bolas y salida por set:
  const esSetImpar = setActivo % 2 === 1;
  const lagWinnerId = marcador.jugador_salida_id || jugador_a.id;
  const jugadorSalidaSetId = setData?.jugador_salida_id || (
    esSetImpar ? lagWinnerId : (lagWinnerId === jugador_a.id ? jugador_b.id : jugador_a.id)
  );

  // Bola asignada para este set: quien tiene la salida juega con BOLA BLANCA ⚪, el rival con BOLA AMARILLA 🟡:
  const bolaSetA: 'blanca' | 'amarilla' = jugadorSalidaSetId === jugador_a.id ? 'blanca' : 'amarilla';
  const bolaSetB: 'blanca' | 'amarilla' = jugadorSalidaSetId === jugador_b.id ? 'blanca' : 'amarilla';
  const tieneSalidaA = jugadorSalidaSetId === jugador_a.id;
  const tieneSalidaB = jugadorSalidaSetId === jugador_b.id;

  // Turno de tiro activo (cuadro amarillo marca de agua):
  const turnoActualId = setData?.turno_jugador_id || jugadorSalidaSetId;
  const esTurnoA = puedeEditar && !setData?.ganador_id && turnoActualId === jugador_a.id;
  const esTurnoB = puedeEditar && !setData?.ganador_id && turnoActualId === jugador_b.id;

  // Límite de entradas y desempate reglamentario por Carambola de Oro:
  const limiteEntradasNum = marcador.modo_libre ? null : (marcador.limite_entradas ?? null);
  const entradasLimiteAlcanzado = Boolean(
    setData?.limite_entradas_alcanzado ||
    (!marcador.modo_libre && limiteEntradasNum && (setData?.entradas_a ?? 0) >= limiteEntradasNum && (setData?.entradas_b ?? 0) >= limiteEntradasNum)
  );

  const metaAlcanzadaAmbos = Boolean(
    meta_a && meta_b &&
    (setData?.carambolas_a ?? 0) >= meta_a &&
    (setData?.carambolas_b ?? 0) >= meta_b &&
    (setData?.entradas_a ?? 0) === (setData?.entradas_b ?? 0) &&
    (setData?.entradas_a ?? 0) > 0
  );

  // Un set está en desempate por Carambola de Oro ÚNICAMENTE si:
  // 1. Está explícitamente marcado en desempate_oro sin ganador asignado, O
  // 2. Se agotó el límite reglamentario de entradas (ambos deportistas) y están empatados, O
  // 3. Ambos completaron la meta reglamentaria en igualdad de entradas y están empatados.
  const setEnDesempateOro = Boolean(
    setData &&
    !setData.ganador_id &&
    (
      setData.desempate_oro ||
      (setData.es_empate && (entradasLimiteAlcanzado || Boolean(setData.limite_entradas_alcanzado) || metaAlcanzadaAmbos))
    )
  );
  const setBloqueadoParaAnotar = Boolean(setData?.ganador_id || setEnDesempateOro || entradasLimiteAlcanzado);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Estado y botón de inicio */}
      {estado === 'pendiente' && hasRole('admin', 'juez') && (
        <div className="text-center mb-6">
          <button
            onClick={abrirProtocoloInicio}
            className="btn-primary text-lg px-8 py-3.5 shadow-lg flex items-center justify-center gap-2 mx-auto"
          >
            <span>🎯</span> Iniciar partida (Protocolo previo)
          </button>
        </div>
      )}

      {/* Modal de Protocolo Previo al Inicio */}
      {mostrarModalInicio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <span>🎯</span> Protocolo de Inicio de Partida
              </h3>
              <button onClick={() => setMostrarModalInicio(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Antes de iniciar la partida, el juez debe verificar la salida, colores de bola y carambolas requeridas por hándicap.
            </p>

            {/* 1. Salida / Quién inicia */}
            <div className="mb-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                1. ¿Quién ganó la salida? (Inicia el juego)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSalidaJugadorId(jugador_a.id);
                    setBolaA('blanca');
                    setBolaB('amarilla');
                  }}
                  className={`p-3 rounded-lg text-left text-sm font-semibold border-2 transition ${
                    salidaJugadorId === jugador_a.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>⚪</span>
                    <span className="text-xs font-bold text-gray-500">JUGADOR A</span>
                  </div>
                  <p className="truncate font-bold">{jugador_a.nombre_completo}</p>
                  {salidaJugadorId === jugador_a.id && (
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">✓ Gana salida</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSalidaJugadorId(jugador_b.id);
                    setBolaB('blanca');
                    setBolaA('amarilla');
                  }}
                  className={`p-3 rounded-lg text-left text-sm font-semibold border-2 transition ${
                    salidaJugadorId === jugador_b.id
                      ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>🟡</span>
                    <span className="text-xs font-bold text-amber-700">JUGADOR B</span>
                  </div>
                  <p className="truncate font-bold">{jugador_b.nombre_completo}</p>
                  {salidaJugadorId === jugador_b.id && (
                    <span className="text-[10px] text-amber-800 font-bold block mt-1">✓ Gana salida</span>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Color de bolas */}
            <div className="mb-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  2. Asignación de Bolas
                </label>
                <button
                  type="button"
                  onClick={alternarColoresBola}
                  className="text-xs text-primary-700 hover:text-primary-800 font-semibold underline flex items-center gap-1"
                >
                  🔄 Invertir colores
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-[10px]">Bola {jugador_a.nombre_completo.split(' ')[0]}:</p>
                    <p className="font-bold capitalize">{bolaA === 'blanca' ? '⚪ Bola Blanca' : '🟡 Bola Amarilla'}</p>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-[10px]">Bola {jugador_b.nombre_completo.split(' ')[0]}:</p>
                    <p className="font-bold capitalize">{bolaB === 'amarilla' ? '🟡 Bola Amarilla' : '⚪ Bola Blanca'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Hándicap / Carambolas meta */}
            <div className="mb-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                3. Hándicap y Distancia (Carambolas a ganar)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-600 block mb-1 truncate">Meta {jugador_a.nombre_completo}:</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={handicapA}
                      onChange={(e) => setHandicapA(Number(e.target.value))}
                      className="input font-bold text-center text-lg h-10 w-full"
                    />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">pts</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-amber-800 block mb-1 truncate">Meta {jugador_b.nombre_completo}:</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={handicapB}
                      onChange={(e) => setHandicapB(Number(e.target.value))}
                      className="input font-bold text-center text-lg h-10 w-full border-amber-300 bg-amber-50"
                    />
                    <span className="absolute right-2 top-2.5 text-xs text-amber-700">pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Límite de Entradas / Modo Libre */}
            <div className="mb-5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  4. Límite de Entradas
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esModoLibre}
                    onChange={(e) => setEsModoLibre(e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span className="font-semibold text-gray-800">Modo Libre (Sin límite)</span>
                </label>
              </div>

              {!esModoLibre ? (
                <div>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {[15, 20, 25, 30, 40, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLimiteEntradas(val)}
                        className={`py-1.5 text-xs font-bold rounded border transition ${
                          limiteEntradas === val
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Se jugará a un máximo de <strong>{limiteEntradas} entradas</strong> por set.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200">
                  ✓ Libre de entradas: La partida termina únicamente cuando un jugador alcance su carambola meta.
                </p>
              )}
            </div>

            {/* 5. Juez Oficial de la Partida */}
            <div className="mb-5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                <span>⚖️</span> 5. Juez Oficial de la Partida
              </label>

              <div className="space-y-2.5">
                {listaJueces.length > 0 && (
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">
                      Seleccionar de la lista de jueces registrados:
                    </label>
                    <select
                      value={juezId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJuezId(val);
                        const sel = listaJueces.find((u) => u.id === val);
                        if (sel) setJuezNombre(sel.nombre);
                      }}
                      className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Seleccionar juez registrado --</option>
                      {listaJueces.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.rol === 'juez' ? 'Juez Oficial' : u.rol})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-gray-700 font-semibold block mb-1">
                    O escribir el nombre del juez en este momento:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={juezNombre}
                      onChange={(e) => {
                        setJuezNombre(e.target.value);
                        if (juezId) setJuezId('');
                      }}
                      placeholder="Escribe el nombre del juez (ej: Don Pedro, Juez 1...)"
                      className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="material-icons absolute left-2.5 top-2 text-gray-400 text-sm">gavel</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    El nombre ingresado se asignará a esta partida y aparecerá en la planilla oficial y actas.
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setMostrarModalInicio(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarInicio}
                disabled={iniciar.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {iniciar.isPending ? 'Iniciando partida...' : '▶ Comenzar Partida Oficial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar o asignar juez en cualquier momento */}
      {modalCambiarJuez && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span>⚖️</span> Asignar / Cambiar Juez de Partida
              </h4>
              <button onClick={() => setModalCambiarJuez(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-3 mb-4">
              {listaJueces.length > 0 && (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Jueces del sistema:</label>
                  <select
                    value={juezId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setJuezId(val);
                      const sel = listaJueces.find((u) => u.id === val);
                      if (sel) setJuezNombre(sel.nombre);
                    }}
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccionar de la lista --</option>
                    {listaJueces.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] text-gray-700 font-semibold block mb-1">
                  Nombre del juez (o escribir manualmente):
                </label>
                <input
                  type="text"
                  value={juezNombre}
                  onChange={(e) => {
                    setJuezNombre(e.target.value);
                    if (juezId) setJuezId('');
                  }}
                  placeholder="Escribe el nombre del juez..."
                  className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalCambiarJuez(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
              <button
                onClick={() => asignarJuezMut.mutate({ juez_id: juezId || null, juez_nombre: juezNombre || null })}
                disabled={asignarJuezMut.isPending}
                className="btn-primary text-xs py-1.5"
              >
                {asignarJuezMut.isPending ? 'Guardando...' : 'Guardar Juez'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ganador Oficial de la Partida */}
      {ganador && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 text-center mb-6 shadow-md">
          <p className="text-4xl mb-1">🏆</p>
          <p className="text-xs uppercase tracking-widest text-emerald-700 font-extrabold">Partida Concluida</p>
          <h2 className="text-emerald-950 font-black text-2xl mt-0.5">
            Ganador: {ganador.nombre_completo}
          </h2>
          <p className="text-base font-bold text-emerald-800 mt-1">
            Victoria {ganador.id === jugador_a.id ? resumen.sets_ganados_a : resumen.sets_ganados_b} — {ganador.id === jugador_a.id ? resumen.sets_ganados_b : resumen.sets_ganados_a} en sets
          </p>
          {!confirmada && hasRole('admin', 'juez') && (
            <button
              onClick={() => confirmar.mutate()}
              disabled={confirmar.isPending}
              className="btn-primary mt-4 text-sm px-6 py-2.5 shadow"
            >
              ✓ Confirmar resultado oficial
            </button>
          )}
          {confirmada && (
            <p className="text-xs font-semibold text-emerald-600 mt-2 bg-emerald-100/60 inline-block px-3 py-1 rounded-full">
              ✓ Resultado confirmado y registrado en ranking
            </p>
          )}
        </div>
      )}

      {/* Indicador de Marca Personal y Barra de Juez */}
      <div className="flex items-center justify-between px-2 mb-2 text-xs text-white/70">
        <span className="font-semibold tracking-wide">TRIBANDA — Marcador Oficial</span>
        <span className="bg-black/30 backdrop-blur-sm px-3 py-0.5 rounded-full border border-white/10 text-[11px]">
          Desarrollado por <strong className="text-emerald-400">Hamilton Quintero</strong>
        </span>
      </div>

      <div className="flex items-center justify-between bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-xl mb-3 border border-white/10 text-xs text-white">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <span>
            Juez Oficial: <strong className="text-yellow-300">{marcador.juez?.nombre || 'Sin juez asignado'}</strong>
          </span>
        </div>
        {hasRole('admin', 'juez') && (
          <button
            onClick={() => {
              setJuezId(marcador.juez?.id || '');
              setJuezNombre(marcador.juez?.nombre || '');
              setModalCambiarJuez(true);
            }}
            className="text-[11px] bg-white/20 hover:bg-white/30 text-white font-medium px-2.5 py-1 rounded-md transition flex items-center gap-1"
          >
            <span>✏️</span> {marcador.juez?.nombre ? 'Cambiar Juez' : 'Asignar Juez'}
          </button>
        )}
      </div>

      {/* Marcador principal con bolas y protocolo visual */}
      <div className="rounded-2xl p-6 mb-4 shadow-xl" style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1a4a1a 100%)' }}>

        <div className="grid grid-cols-3 gap-4 items-center text-center text-white">
          {/* Jugador A */}
          <div
            className={`relative rounded-2xl p-3 sm:p-4 transition-all duration-300 ${
              esTurnoA
                ? 'border-2 border-yellow-400 bg-yellow-400/20 shadow-[0_0_25px_rgba(250,204,21,0.35)] ring-4 ring-yellow-400/40 scale-[1.02]'
                : 'border border-white/10 bg-black/30 opacity-70'
            }`}
          >
            {/* Indicador de turno / espera */}
            {esTurnoA ? (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                <span className="bg-yellow-400 text-yellow-950 font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                  <span>🎱</span> En Turno
                </span>
              </div>
            ) : (
              !setData?.ganador_id && !setBloqueadoParaAnotar && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-black/70 text-gray-300 border border-white/20 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <span>🔒</span> En Espera
                  </span>
                </div>
              )
            )}

            <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs mb-2 border border-white/10">
              <span>{bolaSetA === 'amarilla' ? '🟡' : '⚪'}</span>
              <span className="text-[11px] font-semibold uppercase">{bolaSetA}</span>
              {tieneSalidaA && <span className="text-emerald-400 font-bold">🎯 Salida</span>}
            </div>

            {jugador_a.foto_url && (
              <img src={jugador_a.foto_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border border-white/20 shadow" />
            )}
            <p className="font-bold text-lg leading-tight">{jugador_a.nombre_completo}</p>
            {jugador_a.alias && <p className="text-gray-300 text-xs mt-0.5">"{jugador_a.alias}"</p>}
            <p className="text-5xl font-extrabold mt-3 text-yellow-400 drop-shadow">{setData?.carambolas_a ?? 0}</p>
            {meta_a && (
              <span className="inline-block bg-white/15 text-xs text-green-200 px-2 py-0.5 rounded-md mt-1 font-semibold">
                Meta: {meta_a} pts
              </span>
            )}
            <p className="text-gray-300 text-xs mt-1">
              Entradas: <strong>{setData?.entradas_a ?? 0}</strong>
              {!marcador.modo_libre && marcador.limite_entradas ? ` / ${marcador.limite_entradas}` : ' (Libre)'}
            </p>
          </div>

          {/* Centro */}
          <div>
            <div className="bg-black/40 backdrop-blur-sm inline-block px-3 py-1 rounded-full text-gray-200 text-xs mb-1.5 border border-white/10">
              {estado === 'finalizada' ? '🏁 Partida Finalizada' : total_sets === 1 ? '🏁 Set Único Directo' : `Set ${setActivo} de ${total_sets}`}
            </div>
            <p className="text-[11px] text-emerald-300 font-medium mb-2">
              Salida Set {setActivo}: <strong className="text-white">{tieneSalidaA ? jugador_a.nombre_completo : jugador_b.nombre_completo}</strong> (⚪)
            </p>
            {total_sets > 1 ? (
              <>
                <p className="text-3xl font-extrabold tracking-wide">{resumen.sets_ganados_a} — {resumen.sets_ganados_b}</p>
                <p className="text-gray-300 text-xs mt-1 uppercase tracking-wider font-semibold">Sets Ganados</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold tracking-wide text-yellow-300 uppercase">Distancia Directa</p>
                <p className="text-gray-300 text-xs mt-0.5">Primero en meta o límite</p>
              </>
            )}
          </div>

          {/* Jugador B */}
          <div
            className={`relative rounded-2xl p-3 sm:p-4 transition-all duration-300 ${
              esTurnoB
                ? 'border-2 border-yellow-400 bg-yellow-400/20 shadow-[0_0_25px_rgba(250,204,21,0.35)] ring-4 ring-yellow-400/40 scale-[1.02]'
                : 'border border-white/10 bg-black/30 opacity-70'
            }`}
          >
            {/* Indicador de turno / espera */}
            {esTurnoB ? (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                <span className="bg-yellow-400 text-yellow-950 font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                  <span>🎱</span> En Turno
                </span>
              </div>
            ) : (
              !setData?.ganador_id && !setBloqueadoParaAnotar && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-black/70 text-gray-300 border border-white/20 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <span>🔒</span> En Espera
                  </span>
                </div>
              )
            )}

            <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs mb-2 border border-white/10">
              <span>{bolaSetB === 'amarilla' ? '🟡' : '⚪'}</span>
              <span className="text-[11px] font-semibold uppercase">{bolaSetB}</span>
              {tieneSalidaB && <span className="text-amber-300 font-bold">🎯 Salida</span>}
            </div>

            {jugador_b.foto_url && (
              <img src={jugador_b.foto_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border border-white/20 shadow" />
            )}
            <p className="font-bold text-lg leading-tight">{jugador_b.nombre_completo}</p>
            {jugador_b.alias && <p className="text-gray-300 text-xs mt-0.5">"{jugador_b.alias}"</p>}
            <p className="text-5xl font-extrabold mt-3 text-yellow-400 drop-shadow">{setData?.carambolas_b ?? 0}</p>
            {meta_b && (
              <span className="inline-block bg-amber-400/20 text-xs text-amber-200 px-2 py-0.5 rounded-md mt-1 font-semibold">
                Meta: {meta_b} pts
              </span>
            )}
            <p className="text-gray-300 text-xs mt-1">
              Entradas: <strong>{setData?.entradas_b ?? 0}</strong>
              {!marcador.modo_libre && marcador.limite_entradas ? ` / ${marcador.limite_entradas}` : ' (Libre)'}
            </p>
          </div>
        </div>

        {/* Botones +1 / -1 y Cambio de Turno (Bloqueo estricto por turno) */}
        {puedeEditar && setData && !setBloqueadoParaAnotar && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            {/* Controles Jugador A */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => sumar.mutate({ jugador_id: jugador_a.id, set_numero: setActivo })}
                disabled={!esTurnoA || sumar.isPending || restar.isPending}
                className={`text-2xl font-bold py-4 rounded-xl transition shadow active:scale-95 flex items-center justify-center gap-1 ${
                  esTurnoA
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/40 ring-2 ring-green-400/50 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-gray-400 opacity-30 cursor-not-allowed'
                }`}
                title={esTurnoA ? `Anotar carambola a ${jugador_a.nombre_completo}` : `Bloqueado: Turno de ${jugador_b.nombre_completo}`}
              >
                {!esTurnoA && <span className="text-sm">🔒</span>}
                <span>+1</span>
              </button>
              <button
                onClick={() => restar.mutate({ jugador_id: jugador_a.id, set_numero: setActivo })}
                disabled={!esTurnoA || sumar.isPending || restar.isPending}
                className={`text-lg font-bold py-2 rounded-xl transition active:scale-95 flex items-center justify-center gap-1 ${
                  esTurnoA
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-gray-500 opacity-20 cursor-not-allowed'
                }`}
                title={esTurnoA ? `Restar carambola a ${jugador_a.nombre_completo}` : `Bloqueado: Turno de ${jugador_b.nombre_completo}`}
              >
                {!esTurnoA && <span className="text-xs">🔒</span>}
                <span>-1</span>
              </button>
            </div>

            {/* Control Central: Cambio de Turno */}
            <div className="flex flex-col items-center justify-center gap-1.5">
              <button
                onClick={() => turno.mutate(setActivo)}
                disabled={turno.isPending || setBloqueadoParaAnotar}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-3.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-900/40 flex flex-col items-center justify-center gap-1 w-full active:scale-95 border border-blue-400/40"
              >
                <span className="text-xl">🔄</span>
                <span>Cambio de turno</span>
              </button>
              <span className="text-[10px] text-white/70 text-center leading-tight">
                Orden exclusiva del juez
              </span>
            </div>

            {/* Controles Jugador B */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => sumar.mutate({ jugador_id: jugador_b.id, set_numero: setActivo })}
                disabled={!esTurnoB || sumar.isPending || restar.isPending}
                className={`text-2xl font-bold py-4 rounded-xl transition shadow active:scale-95 flex items-center justify-center gap-1 ${
                  esTurnoB
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/40 ring-2 ring-green-400/50 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-gray-400 opacity-30 cursor-not-allowed'
                }`}
                title={esTurnoB ? `Anotar carambola a ${jugador_b.nombre_completo}` : `Bloqueado: Turno de ${jugador_a.nombre_completo}`}
              >
                {!esTurnoB && <span className="text-sm">🔒</span>}
                <span>+1</span>
              </button>
              <button
                onClick={() => restar.mutate({ jugador_id: jugador_b.id, set_numero: setActivo })}
                disabled={!esTurnoB || sumar.isPending || restar.isPending}
                className={`text-lg font-bold py-2 rounded-xl transition active:scale-95 flex items-center justify-center gap-1 ${
                  esTurnoB
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-gray-500 opacity-20 cursor-not-allowed'
                }`}
                title={esTurnoB ? `Restar carambola a ${jugador_b.nombre_completo}` : `Bloqueado: Turno de ${jugador_a.nombre_completo}`}
              >
                {!esTurnoB && <span className="text-xs">🔒</span>}
                <span>-1</span>
              </button>
            </div>
          </div>
        )}

        {/* Panel Exclusivo de Desempate: Carambola de Oro */}
        {setData && setEnDesempateOro && (
          <div className="mt-5 bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 border-2 border-yellow-400 rounded-2xl p-5 sm:p-6 text-center text-white shadow-2xl animate-fade-in ring-4 ring-yellow-400/30">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-950 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider mb-2 shadow-lg">
              <span>⚔️</span> {entradasLimiteAlcanzado ? 'LÍMITE DE ENTRADAS ALCANZADO — EMPATE REGLAMENTARIO' : 'EMPATE REGLAMENTARIO'}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-yellow-300 mb-2">
              Desempate: Carambola de Oro
            </h3>
            <p className="text-xs sm:text-sm text-yellow-100/90 max-w-lg mx-auto mb-2 leading-relaxed">
              {entradasLimiteAlcanzado
                ? `Ambos deportistas finalizaron sus entradas reglamentarias (${setData.entradas_a} de ${marcador.limite_entradas || 25}) igualados por hándicap (${setData.carambolas_a} pts vs ${setData.carambolas_b} pts).`
                : `Ambos deportistas concluyeron igualados por hándicap (${setData.carambolas_a} pts vs ${setData.carambolas_b} pts).`}
            </p>
            <p className="text-xs text-yellow-200/90 max-w-lg mx-auto mb-5 leading-relaxed bg-black/40 p-3 rounded-xl border border-yellow-400/20">
              🔒 <strong>Entradas y casillas bloqueadas.</strong> No se permiten más turnos ni modificaciones de carambolas. Cada deportista ejecuta su tiro inicial ilimitado en la mesa. <strong>El juez determina a continuación quién ganó la Carambola de Oro:</strong>
            </p>

            {puedeEditar ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => desempateOroMut.mutate({ set_numero: setActivo, ganador_id: jugador_a.id })}
                  disabled={desempateOroMut.isPending}
                  className="bg-yellow-400 hover:bg-yellow-300 text-yellow-950 font-black py-3.5 px-3 rounded-xl shadow-xl transition flex flex-col items-center justify-center gap-1 text-xs sm:text-sm active:scale-95 border-2 border-yellow-200"
                >
                  <span className="text-xl">🏅</span>
                  <span className="leading-tight font-black">{jugador_a.nombre_completo}</span>
                  <span className="text-[10px] text-yellow-900 font-semibold uppercase">Declarar Ganador</span>
                </button>
                <button
                  type="button"
                  onClick={() => desempateOroMut.mutate({ set_numero: setActivo, ganador_id: jugador_b.id })}
                  disabled={desempateOroMut.isPending}
                  className="bg-yellow-400 hover:bg-yellow-300 text-yellow-950 font-black py-3.5 px-3 rounded-xl shadow-xl transition flex flex-col items-center justify-center gap-1 text-xs sm:text-sm active:scale-95 border-2 border-yellow-200"
                >
                  <span className="text-xl">🏅</span>
                  <span className="leading-tight font-black">{jugador_b.nombre_completo}</span>
                  <span className="text-[10px] text-yellow-900 font-semibold uppercase">Declarar Ganador</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-yellow-300/80 italic">A la espera de que el juez oficial declare el ganador del desempate...</p>
            )}
          </div>
        )}

        {/* Acciones de set opcionales (Solo visibles si el set está en juego normal o pendiente de cierre) */}
        {puedeEditar && setData && !setData.ganador_id && !setEnDesempateOro && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            <button
              onClick={() => finSet.mutate(setActivo)}
              disabled={finSet.isPending}
              className="text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition active:scale-95 cursor-pointer"
            >
              {total_sets === 1 ? '🏁 Concluir y Finalizar Partida' : `Finalizar set ${setActivo}`}
            </button>
            <button
              type="button"
              onClick={() => setModalDesempateOro(true)}
              className="text-yellow-300 hover:text-yellow-200 text-xs bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/40 px-4 py-2 rounded-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>⚔️</span> Carambola de Oro (Desempate)
            </button>
          </div>
        )}

        {/* Notificación de set ya concluido */}
        {setData && setData.ganador_id && (
          <div className="mt-5 bg-black/40 backdrop-blur-sm border border-emerald-400/40 rounded-xl p-3.5 text-center text-white">
            <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 flex-wrap">
              <span>✓</span>
              <span>
                Set {setActivo} concluido — Ganó {setData.ganador_id === jugador_a.id ? jugador_a.nombre_completo : jugador_b.nombre_completo}
              </span>
              {setData.desempate_oro && (
                <span className="bg-yellow-400 text-yellow-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                  🏅 Carambola de Oro
                </span>
              )}
            </p>
            {estado === 'en_curso' && sets.some((s) => !s.ganador_id) && (
              <button
                type="button"
                onClick={() => {
                  const proximo = sets.find((s) => !s.ganador_id);
                  if (proximo) setSetActivo(proximo.numero);
                }}
                className="mt-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg transition shadow flex items-center gap-1 mx-auto"
              >
                <span>▶ Ir al Set en juego</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal para declarar Carambola de Oro manualmente */}
      {modalDesempateOro && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100 text-gray-900 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h4 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <span>⚔️</span> Declarar Carambola de Oro (Set {setActivo})
              </h4>
              <button onClick={() => setModalDesempateOro(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              En caso de empate reglamentario, cada jugador ejecuta un tiro desde el punto de partida inicial.
              Como juez oficial, selecciona quién ganó el desempate por Carambola de Oro:
            </p>
            <div className="space-y-2.5 mb-4">
              <button
                type="button"
                onClick={() => desempateOroMut.mutate({ set_numero: setActivo, ganador_id: jugador_a.id })}
                disabled={desempateOroMut.isPending}
                className="w-full text-left p-3.5 rounded-xl border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-950 font-bold transition flex items-center justify-between shadow-sm active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏅</span>
                  <span>{jugador_a.nombre_completo}</span>
                </div>
                <span className="text-[11px] bg-yellow-400 text-yellow-950 px-2.5 py-1 rounded-md font-black uppercase">Declarar Ganador</span>
              </button>
              <button
                type="button"
                onClick={() => desempateOroMut.mutate({ set_numero: setActivo, ganador_id: jugador_b.id })}
                disabled={desempateOroMut.isPending}
                className="w-full text-left p-3.5 rounded-xl border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-950 font-bold transition flex items-center justify-between shadow-sm active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏅</span>
                  <span>{jugador_b.nombre_completo}</span>
                </div>
                <span className="text-[11px] bg-yellow-400 text-yellow-950 px-2.5 py-1 rounded-md font-black uppercase">Declarar Ganador</span>
              </button>
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button onClick={() => setModalDesempateOro(false)} className="btn-secondary text-xs">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs de sets (solo si hay más de 1 set) */}
      {total_sets > 1 && (
        <div className="flex gap-1 mb-4 flex-wrap">
          {Array.from({ length: total_sets }, (_, i) => i + 1).map((n) => {
            const s = sets.find((s) => s.numero === n);
            const labelGanador = s?.ganador_id
              ? s.ganador_id === jugador_a.id
                ? `(A✓${s.desempate_oro ? ' 🏅' : ''})`
                : `(B✓${s.desempate_oro ? ' 🏅' : ''})`
              : s?.es_empate
              ? '(⚔️ Empate)'
              : '';
            return (
              <button key={n} onClick={() => setSetActivo(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  setActivo === n ? 'bg-primary-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}>
                Set {n} {labelGanador}
              </button>
            );
          })}
        </div>
      )}

      {/* Resumen */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold mb-3">Resumen general</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="text-left pb-2">Estadística</th>
              <th className="text-center pb-2">{jugador_a.nombre_completo}</th>
              <th className="text-center pb-2">{jugador_b.nombre_completo}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b"><td className="py-2">Carambolas</td><td className="text-center font-bold">{resumen.carambolas_a}</td><td className="text-center font-bold">{resumen.carambolas_b}</td></tr>
            <tr className="border-b"><td className="py-2">Entradas</td><td className="text-center">{resumen.entradas_a}</td><td className="text-center">{resumen.entradas_b}</td></tr>
            <tr className="border-b"><td className="py-2">Sets ganados</td><td className="text-center text-green-600 font-bold">{resumen.sets_ganados_a}</td><td className="text-center text-green-600 font-bold">{resumen.sets_ganados_b}</td></tr>
            <tr><td className="py-2">Promedio</td><td className="text-center">{resumen.promedio_a.toFixed(3)}</td><td className="text-center">{resumen.promedio_b.toFixed(3)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="text-center mt-4">
        <Link to={`/partidas/${id}/planilla`} className="text-sm text-primary-600 hover:underline">Ver planilla detallada →</Link>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface MarcadorSet {
  numero: number;
  ganador_id?: string;
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

  // Estados para el protocolo previo de inicio
  const [salidaJugadorId, setSalidaJugadorId] = useState<string>('');
  const [bolaA, setBolaA] = useState<'blanca' | 'amarilla' | 'azul'>('blanca');
  const [bolaB, setBolaB] = useState<'blanca' | 'amarilla' | 'azul'>('amarilla');
  const [handicapA, setHandicapA] = useState<number>(30);
  const [handicapB, setHandicapB] = useState<number>(30);
  const [esModoLibre, setEsModoLibre] = useState<boolean>(false);
  const [limiteEntradas, setLimiteEntradas] = useState<number>(25);

  const { data: marcador, isLoading } = useQuery<MarcadorData>({
    queryKey: ['marcador', id],
    queryFn: () => api.get(`/partidas/marcador/${id}`).then((r) => r.data),
    refetchInterval: 2000,
  });

  const iniciar = useMutation({
    mutationFn: (protocoloData: any) => api.patch(`/partidas/${id}/iniciar`, protocoloData),
    onSuccess: () => {
      setMostrarModalInicio(false);
      qc.invalidateQueries({ queryKey: ['marcador', id] });
      qc.invalidateQueries({ queryKey: ['planilla', id] });
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
    });
  }

  const sumar = useMutation({
    mutationFn: (data: { jugador_id: string; set_numero: number }) =>
      api.post(`/partidas/${id}/marcador`, { ...data, accion: 'sumar' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marcador', id] }),
  });

  const restar = useMutation({
    mutationFn: (data: { jugador_id: string; set_numero: number }) =>
      api.post(`/partidas/${id}/marcador`, { ...data, accion: 'restar' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marcador', id] }),
  });

  const turno = useMutation({
    mutationFn: (set_numero: number) => api.post(`/partidas/${id}/turno`, { set_numero }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marcador', id] }),
  });

  const finSet = useMutation({
    mutationFn: (set_numero: number) => api.patch(`/partidas/${id}/set/${set_numero}/finalizar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marcador', id] }),
  });

  const confirmar = useMutation({
    mutationFn: () => api.patch(`/partidas/${id}/confirmar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marcador', id] }),
  });

  if (isLoading || !marcador) return <p className="text-gray-500 p-6">Cargando marcador...</p>;

  const { jugador_a, jugador_b, sets, resumen, estado, ganador, confirmada, total_sets } = marcador;
  const meta_a = marcador.meta_a;
  const meta_b = marcador.meta_b;
  const setData = sets.find((s) => s.numero === setActivo);
  const puedeEditar = estado === 'en_curso' && !confirmada && hasRole('admin', 'juez');

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

      {/* Ganador */}
      {ganador && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center mb-6">
          <p className="text-3xl mb-1">🏆</p>
          <p className="text-green-700 font-bold text-xl">Ganador: {ganador.nombre_completo}</p>
          <p className="text-sm text-green-600 mt-1">
            {resumen.sets_ganados_a} — {resumen.sets_ganados_b} sets
          </p>
          {!confirmada && hasRole('admin', 'juez') && (
            <button onClick={() => confirmar.mutate()} disabled={confirmar.isPending}
              className="btn-primary mt-3">
              ✓ Confirmar resultado
            </button>
          )}
          {confirmada && <p className="text-xs text-green-500 mt-2">✓ Resultado confirmado</p>}
        </div>
      )}

      {/* Marcador principal con bolas y protocolo visual */}
      <div className="rounded-2xl p-6 mb-4 shadow-xl" style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1a4a1a 100%)' }}>
        <div className="grid grid-cols-3 gap-4 items-center text-center text-white">
          {/* Jugador A */}
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs mb-2 border border-white/10">
              <span>{marcador.color_bola_a === 'amarilla' ? '🟡' : '⚪'}</span>
              <span className="text-[11px] font-semibold uppercase">{marcador.color_bola_a ?? 'blanca'}</span>
              {marcador.jugador_salida_id === jugador_a.id && <span className="text-emerald-400 font-bold">🎯 Salida</span>}
            </div>

            {jugador_a.foto_url && <img src={jugador_a.foto_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />}
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
            <div className="bg-black/30 backdrop-blur-sm inline-block px-3 py-1 rounded-full text-gray-200 text-xs mb-2 border border-white/10">
              {total_sets === 1 ? '🏁 Set Único Directo' : `Set ${setActivo} de ${total_sets}`}
            </div>
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
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs mb-2 border border-white/10">
              <span>{marcador.color_bola_b === 'blanca' ? '⚪' : '🟡'}</span>
              <span className="text-[11px] font-semibold uppercase">{marcador.color_bola_b ?? 'amarilla'}</span>
              {marcador.jugador_salida_id === jugador_b.id && <span className="text-amber-300 font-bold">🎯 Salida</span>}
            </div>

            {jugador_b.foto_url && <img src={jugador_b.foto_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />}
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

        {/* Botones +1 / -1 */}
        {puedeEditar && setData && !setData.ganador_id && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="flex flex-col gap-2">
              <button onClick={() => sumar.mutate({ jugador_id: jugador_a.id, set_numero: setActivo })}
                className="bg-green-600 hover:bg-green-700 text-white text-2xl font-bold py-4 rounded-xl transition shadow">+1</button>
              <button onClick={() => restar.mutate({ jugador_id: jugador_a.id, set_numero: setActivo })}
                className="bg-red-600 hover:bg-red-700 text-white text-lg font-bold py-2 rounded-xl transition">-1</button>
            </div>
            <div className="flex items-center justify-center">
              <button onClick={() => turno.mutate(setActivo)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition shadow">
                Cambio de turno
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => sumar.mutate({ jugador_id: jugador_b.id, set_numero: setActivo })}
                className="bg-green-600 hover:bg-green-700 text-white text-2xl font-bold py-4 rounded-xl transition shadow">+1</button>
              <button onClick={() => restar.mutate({ jugador_id: jugador_b.id, set_numero: setActivo })}
                className="bg-red-600 hover:bg-red-700 text-white text-lg font-bold py-2 rounded-xl transition">-1</button>
            </div>
          </div>
        )}

        {/* Finalizar set o partida */}
        {puedeEditar && setData && !setData.ganador_id && (
          <div className="text-center mt-5">
            <button
              onClick={() => finSet.mutate(setActivo)}
              className="text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition"
            >
              {total_sets === 1 ? '🏁 Concluir y Finalizar Partida' : `Finalizar set ${setActivo}`}
            </button>
          </div>
        )}
      </div>

      {/* Tabs de sets (solo si hay más de 1 set) */}
      {total_sets > 1 && (
        <div className="flex gap-1 mb-4">
          {Array.from({ length: total_sets }, (_, i) => i + 1).map((n) => {
            const s = sets.find((s) => s.numero === n);
            return (
              <button key={n} onClick={() => setSetActivo(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  setActivo === n ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}>
                Set {n} {s?.ganador_id ? (s.ganador_id === jugador_a.id ? '(A✓)' : '(B✓)') : ''}
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

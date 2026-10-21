import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Grupo, Jugador } from '../../types';
import { useAuthStore } from '../../store/authStore';

const estadoColor: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700 border-gray-200',
  en_curso: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse',
  finalizada: 'bg-green-100 text-green-800 border-green-200',
};

export default function DetalleGrupoPage() {
  const { torneoId, faseId, id } = useParams<{ torneoId: string; faseId: string; id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole, isAuthenticated } = useAuthStore();
  const puedeGestionarTorneo = hasRole('admin', 'juez') || isAuthenticated();

  const [modalReemplazar, setModalReemplazar] = useState(false);
  const [jugadorSaliente, setJugadorSaliente] = useState<string>('');
  const [jugadorEntrante, setJugadorEntrante] = useState<string>('');
  const [buscarSustituto, setBuscarSustituto] = useState('');

  // Estado para Nueva Partida Manual en Grupo
  const [modalNuevaPartida, setModalNuevaPartida] = useState(false);
  const [partidaJugadorA, setPartidaJugadorA] = useState<string>('');
  const [partidaJugadorB, setPartidaJugadorB] = useState<string>('');
  const [partidaJuezId, setPartidaJuezId] = useState<string>('');
  const [partidaSets, setPartidaSets] = useState<number>(1);

  const { data: grupo, isLoading } = useQuery<Grupo>({
    queryKey: ['grupo', id],
    queryFn: () => api.get(`/grupos/${faseId}/${id}`).then((r) => r.data),
  });

  const { data: todosJugadores = [] } = useQuery<Jugador[]>({
    queryKey: ['jugadores-activos-sustitutos'],
    queryFn: () => api.get('/jugadores?activo=true').then((r) => r.data),
    enabled: modalReemplazar || modalNuevaPartida,
  });

  const { data: jueces = [] } = useQuery<{ id: string; nombre: string }[]>({
    queryKey: ['jueces-oficiales'],
    queryFn: () => api.get('/auth/usuarios?rol=juez').then((r) => r.data),
    enabled: modalNuevaPartida,
  });

  const eliminarGrupoMut = useMutation({
    mutationFn: () => api.delete(`/grupos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      alert('Grupo eliminado exitosamente.');
      navigate(`/torneos/${torneoId}/fases/${faseId}/grupos`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'No se pudo eliminar el grupo.');
    },
  });

  const generarPartidasMut = useMutation({
    mutationFn: () => api.post(`/grupos/${id}/generar-partidas`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['grupo', id] });
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['partidas'] });
      alert(res.data?.mensaje || `Se generaron ${res.data.total_creadas} partidas para este grupo.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al generar partidas.');
    },
  });

  const crearPartidaManualMut = useMutation({
    mutationFn: () => {
      if (!partidaJugadorA || !partidaJugadorB) throw new Error('Selecciona ambos jugadores');
      if (partidaJugadorA === partidaJugadorB) throw new Error('Los jugadores deben ser distintos');
      return api.post('/partidas', {
        fase_id: faseId,
        grupo_id: id,
        jugador_a_id: partidaJugadorA,
        jugador_b_id: partidaJugadorB,
        juez_id: partidaJuezId || undefined,
        total_sets: partidaSets,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo', id] });
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['partidas'] });
      setModalNuevaPartida(false);
      setPartidaJugadorA('');
      setPartidaJugadorB('');
      setPartidaJuezId('');
      alert('¡Partida manual creada exitosamente para este grupo!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || 'Error al crear la partida manual');
    },
  });

  const reemplazarMut = useMutation({
    mutationFn: () =>
      api.post(`/grupos/${id}/reemplazar`, {
        jugador_saliente_id: jugadorSaliente,
        jugador_entrante_id: jugadorEntrante,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo', id] });
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      setModalReemplazar(false);
      setJugadorSaliente('');
      setJugadorEntrante('');
      setBuscarSustituto('');
      alert('Jugador sustituido con éxito en el grupo y en las partidas pendientes.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al sustituir jugador.');
    },
  });

  const eliminarJugadorMut = useMutation({
    mutationFn: (jugadorId: string) => api.delete(`/grupos/${id}/jugadores/${jugadorId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo', id] });
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      alert('Jugador retirado del grupo y partidas pendientes actualizadas.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al retirar jugador.');
    },
  });

  if (isLoading) return <p className="text-gray-500 py-8 text-center">Cargando grupo...</p>;
  if (!grupo) return <p className="text-red-500 py-8 text-center">Grupo no encontrado</p>;

  const partidasActivas = grupo.partidas?.some((p) => p.estado === 'en_curso' || p.estado === 'finalizada');
  const jugadoresActualesIds = new Set(grupo.jugadores?.map((gj) => gj.jugador_id) || []);

  const sustitutosDisponibles = todosJugadores.filter(
    (j) =>
      !jugadoresActualesIds.has(j.id) &&
      (!buscarSustituto.trim() ||
        j.nombre_completo.toLowerCase().includes(buscarSustituto.toLowerCase()) ||
        (j.alias && j.alias.toLowerCase().includes(buscarSustituto.toLowerCase())) ||
        (j.club_ciudad && j.club_ciudad.toLowerCase().includes(buscarSustituto.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <Link
            to={`/torneos/${torneoId}/fases/${faseId}/grupos`}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            <span>←</span> Volver a la cartelera de grupos
          </Link>
          <h1 className="text-2xl font-bold font-heading text-gray-900 mt-1 flex items-center gap-2">
            <span>🎱</span> Grupo {grupo.numero} {grupo.letra ? `— ${grupo.letra}` : ''}
          </h1>
          <p className="text-xs text-gray-500">
            {grupo.jugadores?.length || 0} Jugadores asignados • {grupo.partidas?.length || 0} Partidas
          </p>
        </div>

        {puedeGestionarTorneo && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generarPartidasMut.mutate()}
              disabled={generarPartidasMut.isPending || (grupo.jugadores?.length || 0) < 2}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Generar todas las combinaciones de partidas restantes de este grupo"
            >
              <span className="material-icons text-sm">auto_awesome</span>
              {generarPartidasMut.isPending
                ? 'Generando...'
                : (!grupo.partidas || grupo.partidas.length === 0)
                ? '⚡ Generar Partidas'
                : '⚡ Generar Partidas Faltantes'}
            </button>

            <button
              onClick={() => {
                const j1 = grupo.jugadores?.[0]?.jugador_id || '';
                const j2 = grupo.jugadores?.[1]?.jugador_id || '';
                setPartidaJugadorA(j1);
                setPartidaJugadorB(j2);
                setModalNuevaPartida(true);
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Crear un enfrentamiento manual específico para este grupo"
            >
              <span>+</span>
              <span>Nueva Partida Manual</span>
            </button>

            <button
              onClick={() => setModalReemplazar(true)}
              className="btn-secondary text-xs flex items-center gap-1"
              title="Cambiar o sustituir un jugador que no asistió"
            >
              <span className="material-icons text-sm">swap_horiz</span>
              Reemplazar Jugador
            </button>

            <Link
              to={`/torneos/${torneoId}/fases/${faseId}/grupos/${id}/asignar`}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <span className="material-icons text-sm">group_add</span>
              Editar Asignación
            </Link>

            {!partidasActivas && (
              <button
                onClick={() => {
                  if (confirm(`¿Seguro que deseas eliminar el Grupo ${grupo.numero}? Esta acción cancelará las partidas pendientes de este grupo.`)) {
                    eliminarGrupoMut.mutate();
                  }
                }}
                disabled={eliminarGrupoMut.isPending}
                className="btn-outline text-xs text-red-600 border-red-300 hover:bg-red-50"
                title="Eliminar grupo y sus partidas pendientes"
              >
                <span className="material-icons text-sm">delete</span>
                Eliminar Grupo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabla de posiciones oficial */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-gray-900 text-lg flex items-center gap-2">
            <span>🏆</span> Tabla de Posiciones del Grupo
          </h2>
          <span className="text-xs text-gray-500">
            Criterios UMB: Puntos → Prom. Gral → Prom. Ind. → Mayor Serie
          </span>
        </div>

        {(!grupo.tabla || grupo.tabla.length === 0) ? (
          <p className="text-gray-400 text-sm py-4 text-center">Sin jugadores asignados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-billar">
              <thead>
                <tr>
                  <th className="w-12 text-center">Pos</th>
                  <th>Jugador</th>
                  <th>Club</th>
                  <th className="text-center font-bold">Pts</th>
                  <th className="text-center">Prom. Gral</th>
                  <th className="text-center">Prom. Ind.</th>
                  <th className="text-center">M. Serie</th>
                  <th className="text-center">CAR</th>
                  <th className="text-center">ENT</th>
                  {puedeGestionarTorneo && <th className="text-center w-20">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {grupo.tabla.map((fila) => {
                  const clasifica = fila.posicion <= 2;
                  return (
                    <tr key={fila.jugador_id} className={clasifica ? 'bg-green-50/70 font-semibold' : ''}>
                      <td className="text-center font-bold">
                        {clasifica ? (
                          <span className="inline-flex items-center gap-1">
                            {fila.posicion}
                            <span className="badge-green text-[10px] px-1.5 py-0.2">✓</span>
                          </span>
                        ) : fila.posicion}
                      </td>
                      <td className="font-medium text-gray-900">{fila.nombre_completo}</td>
                      <td className="text-gray-500 text-xs">{fila.club || '-'}</td>
                      <td className="text-center font-bold text-gray-900">{fila.puntos}</td>
                      <td className="text-center font-bold text-primary-700">{fila.promedio.toFixed(3)}</td>
                      <td className="text-center text-xs text-gray-600">
                        {fila.promedio_particular ? fila.promedio_particular.toFixed(3) : '-'}
                      </td>
                      <td className="text-center font-semibold text-accent-700">{fila.mayor_serie ?? 0}</td>
                      <td className="text-center">{fila.carambolas}</td>
                      <td className="text-center">{fila.entradas}</td>
                      {puedeGestionarTorneo && (
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Deseas retirar a ${fila.nombre_completo} de este grupo? Se cancelarán sus partidas pendientes.`)) {
                                eliminarJugadorMut.mutate(fila.jugador_id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title="Retirar jugador del grupo"
                          >
                            Retirar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Partidas del grupo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-heading font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
          <span>⚔️</span> Partidas del Grupo ({grupo.partidas?.length || 0})
        </h2>

        {(!grupo.partidas || grupo.partidas.length === 0) ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">No hay partidas generadas para este grupo.</p>
            {puedeGestionarTorneo && (grupo.jugadores?.length || 0) >= 2 && (
              <button
                onClick={() => generarPartidasMut.mutate()}
                className="btn-primary text-xs mt-3 inline-flex items-center gap-1"
              >
                <span className="material-icons text-sm">play_arrow</span>
                Generar partidas ahora
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {grupo.partidas.map((p, idx) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border rounded-xl p-3 hover:bg-gray-50/70 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-gray-400 w-6">#{idx + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <span className={p.ganador_id === p.jugador_a_id ? 'font-bold text-green-700' : ''}>
                        {p.jugador_a?.nombre_completo}
                      </span>
                      <span className="text-gray-400 font-normal text-xs">vs</span>
                      <span className={p.ganador_id === p.jugador_b_id ? 'font-bold text-green-700' : ''}>
                        {p.jugador_b?.nombre_completo}
                      </span>
                    </div>
                    {p.ganador && (
                      <p className="text-xs text-green-600 font-medium mt-0.5">
                        Ganador: {p.ganador.nombre_completo}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${estadoColor[p.estado] || 'bg-gray-100'}`}>
                    {p.estado === 'en_curso' ? '● En juego' : p.estado === 'finalizada' ? '✓ Finalizada' : 'Pendiente'}
                  </span>
                  <Link
                    to={`/partidas/${p.id}/planilla`}
                    className="btn-primary text-xs flex items-center gap-1 py-1 px-3"
                  >
                    <span className="material-icons text-sm">description</span>
                    Planilla
                  </Link>
                  <Link
                    to={`/partidas/${p.id}/marcador`}
                    className="btn-secondary text-xs flex items-center gap-1 py-1 px-3"
                  >
                    <span className="material-icons text-sm">tv</span>
                    Marcador
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Reemplazar Jugador */}
      {modalReemplazar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <span>🔄</span> Reemplazar Jugador en Grupo
              </h3>
              <button onClick={() => setModalReemplazar(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Útil si un participante no asistió, se retiró o llegó un reemplazo de última hora. Las partidas pendientes se transferirán automáticamente al nuevo jugador.
            </p>

            {/* Jugador saliente */}
            <div className="mb-4">
              <label className="label text-xs uppercase font-semibold text-gray-700">1. Jugador a sustituir (Saliente)</label>
              <select
                value={jugadorSaliente}
                onChange={(e) => setJugadorSaliente(e.target.value)}
                className="input text-sm"
              >
                <option value="">-- Seleccionar jugador del grupo --</option>
                {grupo.jugadores?.map((gj) => (
                  <option key={gj.jugador_id} value={gj.jugador_id}>
                    {gj.jugador?.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* Jugador entrante */}
            <div className="mb-5">
              <label className="label text-xs uppercase font-semibold text-gray-700">2. Jugador nuevo (Entrante)</label>
              <input
                type="text"
                value={buscarSustituto}
                onChange={(e) => setBuscarSustituto(e.target.value)}
                placeholder="Filtrar por nombre o club..."
                className="input text-xs mb-2"
              />
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {sustitutosDisponibles.slice(0, 15).map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setJugadorEntrante(j.id)}
                    className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center border-b last:border-0 hover:bg-primary-50 transition ${
                      jugadorEntrante === j.id ? 'bg-primary-100 font-bold text-primary-900' : ''
                    }`}
                  >
                    <span>{j.nombre_completo} {j.alias ? `"${j.alias}"` : ''}</span>
                    <span className="text-gray-400">{j.club_ciudad}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setModalReemplazar(false)}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => reemplazarMut.mutate()}
                disabled={!jugadorSaliente || !jugadorEntrante || reemplazarMut.isPending}
                className="btn-primary text-xs"
              >
                {reemplazarMut.isPending ? 'Sustituyendo...' : 'Confirmar Reemplazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Partida Manual en Grupo */}
      {modalNuevaPartida && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  🎱
                </span>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Nueva Partida Manual — Grupo {grupo.numero}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Crea cualquier enfrentamiento directo o desempate para este grupo sin restricciones.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevaPartida(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Jugador A */}
              <div>
                <label className="label text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span>⚪ Jugador A (Bola Blanca) *</span>
                </label>
                <select
                  value={partidaJugadorA}
                  onChange={(e) => setPartidaJugadorA(e.target.value)}
                  className="input text-xs font-medium"
                >
                  <option value="">-- Seleccionar Jugador A --</option>
                  <optgroup label="Jugadores de este Grupo">
                    {grupo.jugadores?.map((gj) => (
                      <option key={gj.jugador_id} value={gj.jugador_id}>
                        ⭐ {gj.jugador?.nombre_completo} ({gj.jugador?.club_ciudad || 'Sin club'})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Todos los Jugadores Activos">
                    {todosJugadores
                      .filter((j) => !grupo.jugadores?.some((gj) => gj.jugador_id === j.id))
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nombre_completo} ({j.club_ciudad || 'Sin club'})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Jugador B */}
              <div>
                <label className="label text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span>🟡 Jugador B (Bola Amarilla) *</span>
                </label>
                <select
                  value={partidaJugadorB}
                  onChange={(e) => setPartidaJugadorB(e.target.value)}
                  className="input text-xs font-medium"
                >
                  <option value="">-- Seleccionar Jugador B --</option>
                  <optgroup label="Jugadores de este Grupo">
                    {grupo.jugadores?.map((gj) => (
                      <option key={gj.jugador_id} value={gj.jugador_id}>
                        ⭐ {gj.jugador?.nombre_completo} ({gj.jugador?.club_ciudad || 'Sin club'})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Todos los Jugadores Activos">
                    {todosJugadores
                      .filter((j) => !grupo.jugadores?.some((gj) => gj.jugador_id === j.id))
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nombre_completo} ({j.club_ciudad || 'Sin club'})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Sets */}
                <div>
                  <label className="label text-xs font-bold text-gray-800">Sets de Partida</label>
                  <select
                    value={partidaSets}
                    onChange={(e) => setPartidaSets(Number(e.target.value))}
                    className="input text-xs font-medium"
                  >
                    <option value={1}>1 Set (Estándar grupos)</option>
                    <option value={2}>2 Sets</option>
                    <option value={3}>3 Sets (Al mejor de 3)</option>
                    <option value={5}>5 Sets</option>
                  </select>
                </div>

                {/* Juez Asignado */}
                <div>
                  <label className="label text-xs font-bold text-gray-800">Juez Oficial (Opcional)</label>
                  <select
                    value={partidaJuezId}
                    onChange={(e) => setPartidaJuezId(e.target.value)}
                    className="input text-xs font-medium"
                  >
                    <option value="">Sin juez asignado</option>
                    {jueces.map((j) => (
                      <option key={j.id} value={j.id}>
                        ⚖️ {j.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {partidaJugadorA && partidaJugadorB && partidaJugadorA === partidaJugadorB && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  ⚠️ Jugador A y Jugador B no pueden ser la misma persona.
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 mt-4 border-t">
              <button
                type="button"
                onClick={() => setModalNuevaPartida(false)}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => crearPartidaManualMut.mutate()}
                disabled={
                  !partidaJugadorA ||
                  !partidaJugadorB ||
                  partidaJugadorA === partidaJugadorB ||
                  crearPartidaManualMut.isPending
                }
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <span>{crearPartidaManualMut.isPending ? 'Guardando...' : 'Crear Partida en Grupo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

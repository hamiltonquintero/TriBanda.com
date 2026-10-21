import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Torneo, InscripcionTorneo, Jugador } from '../../types';
import { useAuthStore } from '../../store/authStore';
import GuiaInteractivaAdmin from '../../components/GuiaInteractivaAdmin';

const estadoSiguiente: Record<string, string> = { borrador: 'activo', activo: 'finalizado' };
const estadoLabel: Record<string, string> = { borrador: 'Activar torneo', activo: 'Finalizar torneo' };

export default function DetalleTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();

  const [modalInscribir, setModalInscribir] = useState(false);
  const [buscarJugador, setBuscarJugador] = useState('');
  const [seleccionadosLote, setSeleccionadosLote] = useState<string[]>([]);
  const [metasPorJugador, setMetasPorJugador] = useState<Record<string, number>>({});
  const [handicapLoteDefault, setHandicapLoteDefault] = useState<number | ''>('');
  const [filtroTablaInscritos, setFiltroTablaInscritos] = useState<'todos' | 'pagados' | 'pendientes'>('todos');

  const { data: torneo, isLoading } = useQuery<Torneo>({
    queryKey: ['torneo', id],
    queryFn: () => api.get(`/torneos/${id}`).then((r) => r.data),
  });

  const { data: inscripciones = [], isLoading: cargandoInscripciones } = useQuery<InscripcionTorneo[]>({
    queryKey: ['inscripciones-torneo', id],
    queryFn: () => api.get(`/inscripciones/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: todosJugadores = [] } = useQuery<Jugador[]>({
    queryKey: ['jugadores-activos-para-inscribir'],
    queryFn: () => api.get('/jugadores?activo=true').then((r) => r.data),
    enabled: modalInscribir,
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado: string) => api.patch(`/torneos/${id}/estado`, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torneo', id] }),
  });

  const togglePago = useMutation({
    mutationFn: ({ inscripcionId, pago }: { inscripcionId: string; pago: boolean }) =>
      api.put(`/inscripciones/meta/${inscripcionId}`, { pago_confirmado: pago }),
    onMutate: async ({ inscripcionId, pago }) => {
      await qc.cancelQueries({ queryKey: ['inscripciones-torneo', id] });
      const previo = qc.getQueryData<InscripcionTorneo[]>(['inscripciones-torneo', id]);
      qc.setQueryData<InscripcionTorneo[]>(['inscripciones-torneo', id], (old = []) =>
        old.map((ins) => (ins.id === inscripcionId ? { ...ins, pago_confirmado: pago } : ins))
      );
      return { previo };
    },
    onError: (_err, _vars, context) => {
      if (context?.previo) {
        qc.setQueryData(['inscripciones-torneo', id], context.previo);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones-torneo', id] });
    },
  });

  const actualizarMetaMut = useMutation({
    mutationFn: ({ inscripcionId, meta_puntos }: { inscripcionId: string; meta_puntos: number }) =>
      api.put(`/inscripciones/meta/${inscripcionId}`, { meta_puntos }),
    onMutate: async ({ inscripcionId, meta_puntos }) => {
      await qc.cancelQueries({ queryKey: ['inscripciones-torneo', id] });
      const previo = qc.getQueryData<InscripcionTorneo[]>(['inscripciones-torneo', id]);
      qc.setQueryData<InscripcionTorneo[]>(['inscripciones-torneo', id], (old = []) =>
        old.map((ins) => (ins.id === inscripcionId ? { ...ins, meta_puntos } : ins))
      );
      return { previo };
    },
    onError: (_err, _vars, context) => {
      if (context?.previo) {
        qc.setQueryData(['inscripciones-torneo', id], context.previo);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones-torneo', id] });
    },
  });

  const inscribirLoteMut = useMutation({
    mutationFn: ({ jugador_ids, metas }: { jugador_ids: string[]; metas?: Record<string, number> }) =>
      api.post(`/inscripciones/${id}/lote`, { jugador_ids, metas }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inscripciones-torneo', id] });
      setModalInscribir(false);
      setSeleccionadosLote([]);
      setMetasPorJugador({});
      setHandicapLoteDefault('');
      setBuscarJugador('');
      alert(`¡Éxito! Se inscribieron ${res.data.agregados} jugadores al torneo.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al inscribir lote');
    },
  });

  const removerInscripcionMut = useMutation({
    mutationFn: (jugadorId: string) => api.delete(`/inscripciones/${id}/${jugadorId}`),
    onMutate: async (jugadorId) => {
      await qc.cancelQueries({ queryKey: ['inscripciones-torneo', id] });
      const previo = qc.getQueryData<InscripcionTorneo[]>(['inscripciones-torneo', id]);
      qc.setQueryData<InscripcionTorneo[]>(['inscripciones-torneo', id], (old = []) =>
        old.filter((ins) => ins.jugador_id !== jugadorId)
      );
      return { previo };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previo) {
        qc.setQueryData(['inscripciones-torneo', id], context.previo);
      }
      alert(err.response?.data?.error || 'Error al remover inscripción');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones-torneo', id] });
    },
  });

  function imprimirListadoInscritos() {
    if (inscripciones.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaHoy = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const filasHtml = inscripciones.map((ins, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td><strong>${ins.jugador?.nombre_completo}</strong></td>
        <td>${ins.jugador?.club?.nombre ?? ins.jugador?.club_ciudad ?? '-'}</td>
        <td style="text-align: center; text-transform: capitalize;">${ins.nivel}</td>
        <td style="text-align: center; font-weight: bold; color: #166534;">${ins.meta_puntos} pts</td>
        <td style="text-align: center; font-weight: bold; color: ${ins.pago_confirmado ? '#166534' : '#dc2626'};">
          ${ins.pago_confirmado ? '✓ PAGADO' : 'PENDIENTE'}
        </td>
      </tr>
    `).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Planilla Oficial de Inscritos - ${torneo?.nombre}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; padding: 16px; }
            .header { border-bottom: 3px solid #166534; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: 800; color: #166534; text-transform: uppercase; }
            .sub { font-size: 11px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #f3f4f6; color: #374151; padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; }
            td { padding: 6px 8px; border: 1px solid #e5e7eb; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">🎱 Planilla Oficial de Inscripción</div>
              <div class="sub">${torneo?.nombre} — Sede: ${torneo?.sede}</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #4b5563;">
              <div>Fecha: <strong>${fechaHoy}</strong></div>
              <div>Total Inscritos: <strong>${inscripciones.length}</strong></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Nombre del Billarista</th>
                <th>Club / Ciudad</th>
                <th style="text-align: center;">Nivel</th>
                <th style="text-align: center;">Distancia (Carambolas)</th>
                <th style="text-align: center;">Estado de Pago</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
          <div class="footer">
            Sistema Oficial TriBanda — Software Especializado de Billar a Tres Bandas
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(docHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  if (isLoading) return <p className="text-gray-500 py-12 text-center">Cargando torneo...</p>;
  if (!torneo) return <p className="text-red-500 py-12 text-center">Torneo no encontrado</p>;

  const siguienteEstado = estadoSiguiente[torneo.estado];
  const yaInscritosIds = new Set(inscripciones.map((ins) => ins.jugador_id));
  const disponiblesParaInscribir = todosJugadores.filter(
    (j) =>
      !yaInscritosIds.has(j.id) &&
      (!buscarJugador.trim() ||
        j.nombre_completo.toLowerCase().includes(buscarJugador.toLowerCase()) ||
        (j.alias && j.alias.toLowerCase().includes(buscarJugador.toLowerCase())) ||
        (j.club_ciudad && j.club_ciudad.toLowerCase().includes(buscarJugador.toLowerCase())))
  );

  const pagadosCount = inscripciones.filter((i) => i.pago_confirmado).length;

  return (
    <div className="space-y-6">
      {/* Header del torneo */}
      <div
        className="card-dark"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1a4a1a 100%)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs px-3 py-1 rounded-full font-bold estado-${torneo.estado} inline-block`}>
                {torneo.estado.toUpperCase()}
              </span>
              {torneo.modalidad === 'profesional' && (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-400 text-amber-950 shadow-sm">
                  🏆 Oficial / Profesional (3 Sets)
                </span>
              )}
              {torneo.modalidad === 'local' && (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-400 text-emerald-950 shadow-sm">
                  🎱 Torneo Local (1 Set {torneo.modo_libre ? '• Libre' : `• ${torneo.limite_entradas || 25} entradas`})
                </span>
              )}
              {torneo.modalidad === 'relampago' && (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-yellow-300 text-yellow-950 shadow-sm">
                  ⚡ Relámpago ({torneo.distancia_relampago === 'largo' ? 'Juego Largo 15-18' : 'Juego Corto 8-10'})
                </span>
              )}
            </div>
            <h1 className="text-3xl font-heading font-extrabold text-white">{torneo.nombre}</h1>
            {torneo.descripcion && <p className="text-green-200/80 mt-1">{torneo.descripcion}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-green-100/80">
              <span>
                <span className="material-icons text-xs align-middle mr-1 text-accent-400">location_on</span>
                {torneo.sede}
              </span>
              <span>
                <span className="material-icons text-xs align-middle mr-1 text-accent-400">calendar_today</span>
                {new Date(torneo.fecha_inicio).toLocaleDateString('es-CO')} —{' '}
                {new Date(torneo.fecha_fin).toLocaleDateString('es-CO')}
              </span>
              <span>
                <span className="material-icons text-xs align-middle mr-1 text-accent-400">trending_up</span>
                Incremento: {(torneo.incremento * 100).toFixed(0)}%
              </span>
              <span>
                <span className="material-icons text-xs align-middle mr-1 text-accent-400">sports</span>
                Carambolas Base: {torneo.meta_base ?? 30} pts
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/publico/torneos/${id}`} className="btn-outline text-white border-white/30 hover:bg-white/10">
              Vista pública
            </Link>
            {hasRole('admin') && torneo.estado === 'borrador' && (
              <Link to={`/torneos/${id}/editar`} className="btn-outline text-white border-white/30 hover:bg-white/10">
                Editar
              </Link>
            )}
            {hasRole('admin') && siguienteEstado && (
              <button
                onClick={() => cambiarEstado.mutate(siguienteEstado)}
                className="btn-secondary"
                disabled={cambiarEstado.isPending}
              >
                {estadoLabel[torneo.estado]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guía Interactiva Asistida Paso a Paso */}
      <GuiaInteractivaAdmin
        torneo={torneo}
        inscripciones={inscripciones}
        onOpenInscribir={() => {
          setSeleccionadosLote([]);
          setModalInscribir(true);
        }}
      />

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Grupos', path: `/torneos/${id}/grupos`, icon: 'groups', color: 'text-primary-600' },
          { label: 'Partidas', path: `/torneos/${id}/partidas`, icon: 'sports_score', color: 'text-accent-500' },
          { label: 'Bracket', path: `/torneos/${id}/bracket`, icon: 'account_tree', color: 'text-primary-600' },
          { label: 'Ranking', path: `/torneos/${id}/ranking`, icon: 'leaderboard', color: 'text-accent-500' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="card-flat hover:shadow-lg transition text-center group p-4 bg-white rounded-xl border border-gray-200"
          >
            <span className={`material-icons text-4xl ${item.color} group-hover:scale-110 transition-transform block mb-2`}>
              {item.icon}
            </span>
            <span className="text-sm font-heading font-semibold text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Fases del torneo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2">
            <span className="material-icons text-primary-600">layers</span>
            Fases del Torneo
          </h2>
          {hasRole('admin') && torneo.estado === 'borrador' && (
            <Link to={`/torneos/${id}/fases/nueva`} className="btn-primary text-xs">
              <span className="material-icons text-xs mr-1 align-middle">add</span>Agregar fase
            </Link>
          )}
        </div>
        {!torneo.fases || torneo.fases.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay fases configuradas aún.</p>
        ) : (
          <ol className="space-y-2.5">
            {torneo.fases.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between text-sm bg-gray-50 border rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                    {f.orden}
                  </span>
                  <span className="capitalize font-semibold text-gray-800">{f.tipo}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(f.fecha).toLocaleDateString('es-CO')}
                  </span>
                </div>
                {f.tipo === 'grupos' || f.tipo === 'clasificatorio' ? (
                  <Link
                    to={`/torneos/${id}/fases/${f.id}/grupos`}
                    className="text-xs text-primary-600 hover:underline font-semibold"
                  >
                    Ver Grupos →
                  </Link>
                ) : (
                  <Link
                    to={`/torneos/${id}/bracket`}
                    className="text-xs text-primary-600 hover:underline font-semibold"
                  >
                    Ver Bracket / Llaves →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Participantes Inscritos y Control de Pagos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b pb-3">
          <div>
            <h2 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2">
              <span className="material-icons text-primary-600">how_to_reg</span>
              Participantes Inscritos ({inscripciones.length})
            </h2>
            <p className="text-xs text-gray-500">
              Control de asistencia, pago de inscripción y handicap individual
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-primary text-xs px-2.5 py-1">
              💰 Pagados: {pagadosCount} / {inscripciones.length}
            </span>

            {inscripciones.length > 0 && (
              <button
                type="button"
                onClick={imprimirListadoInscritos}
                className="btn-outline text-xs text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1 shadow-2xs"
                title="Imprimir planilla de inscritos con estado de pago"
              >
                <span className="material-icons text-sm">print</span>
                Imprimir Planilla
              </button>
            )}

            {hasRole('admin') && (
              <button
                type="button"
                onClick={() => {
                  setSeleccionadosLote([]);
                  setModalInscribir(true);
                }}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                title="Abrir directorio general y chulear los jugadores que participarán"
              >
                <span className="material-icons text-sm">checklist</span>
                📋 Directorio (+ Seleccionar Participantes)
              </button>
            )}
          </div>
        </div>

        {cargandoInscripciones && (
          <p className="text-gray-400 text-xs py-4 text-center">Cargando inscripciones...</p>
        )}

        {/* Filtros de la tabla de inscritos */}
        {!cargandoInscripciones && inscripciones.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
            <button
              type="button"
              onClick={() => setFiltroTablaInscritos('todos')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                filtroTablaInscritos === 'todos'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({inscripciones.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTablaInscritos('pagados')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                filtroTablaInscritos === 'pagados'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-green-50 text-green-800 hover:bg-green-100'
              }`}
            >
              💰 Pagados ({pagadosCount})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTablaInscritos('pendientes')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                filtroTablaInscritos === 'pendientes'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              ⏳ Pago Pendiente ({inscripciones.length - pagadosCount})
            </button>
          </div>
        )}

        {!cargandoInscripciones && inscripciones.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">No hay jugadores inscritos en este torneo aún.</p>
            {hasRole('admin') && (
              <button
                type="button"
                onClick={() => {
                  setSeleccionadosLote([]);
                  setModalInscribir(true);
                }}
                className="btn-primary text-xs mt-3 inline-flex items-center gap-1.5"
              >
                <span className="material-icons text-sm">how_to_reg</span>
                Abrir Directorio y Seleccionar Participantes
              </button>
            )}
          </div>
        )}

        {!cargandoInscripciones && inscripciones.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-billar text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-center">#</th>
                  <th>Jugador</th>
                  <th>Club / Ciudad</th>
                  <th className="text-center">Categoría</th>
                  <th className="text-center">Carambolas</th>
                  <th className="text-center">Participación</th>
                  <th className="text-center">Pago Inscripción</th>
                  {hasRole('admin') && <th className="text-center w-20">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {inscripciones
                  .filter((ins) => {
                    if (filtroTablaInscritos === 'pagados') return ins.pago_confirmado;
                    if (filtroTablaInscritos === 'pendientes') return !ins.pago_confirmado;
                    return true;
                  })
                  .map((ins, idx) => (
                    <tr key={ins.id} className="hover:bg-gray-50 transition">
                      <td className="text-center font-bold text-gray-400">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {ins.jugador?.foto_url ? (
                            <img
                              src={ins.jugador.foto_url}
                              alt={ins.jugador.nombre_completo}
                              className="w-7 h-7 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                              {ins.jugador?.nombre_completo?.charAt(0) || 'J'}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-900 block leading-tight">
                              {ins.jugador?.nombre_completo}
                            </span>
                            {ins.jugador?.alias && (
                              <span className="text-gray-400 italic text-[11px]">"{ins.jugador.alias}"</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-500">
                        {ins.jugador?.club?.nombre ?? ins.jugador?.club_ciudad ?? '-'}
                      </td>
                      <td className="text-center capitalize font-medium text-gray-700">
                        <span className="badge-blue text-[10px] px-2 py-0.5">{ins.nivel}</span>
                      </td>
                      <td className="text-center">
                        {hasRole('admin') ? (
                          <div className="inline-flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              defaultValue={ins.meta_puntos}
                              key={`meta-${ins.id}-${ins.meta_puntos}`}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0 && val !== ins.meta_puntos) {
                                  actualizarMetaMut.mutate({ inscripcionId: ins.id, meta_puntos: val });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-14 text-center font-mono font-black text-emerald-950 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-sm"
                              title="Haz clic o escribe para modificar el handicap de carambolas"
                            />
                            <span className="text-[10px] text-emerald-700 font-bold">pts</span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-primary-700">
                            {ins.meta_puntos} pts
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="badge-green text-[10px] px-2 py-0.5 font-bold inline-flex items-center gap-1">
                          <span>✓</span> Participa
                        </span>
                      </td>
                      <td className="text-center">
                        {hasRole('admin') ? (
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ins.pago_confirmado}
                              onChange={(e) =>
                                togglePago.mutate({
                                  inscripcionId: ins.id,
                                  pago: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-green-600 rounded cursor-pointer"
                            />
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ins.pago_confirmado
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {ins.pago_confirmado ? 'Pagado' : 'Pendiente'}
                            </span>
                          </label>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ins.pago_confirmado
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {ins.pago_confirmado ? 'Pagado' : 'Pendiente'}
                          </span>
                        )}
                      </td>
                      {hasRole('admin') && (
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Retirar a ${ins.jugador?.nombre_completo} de este torneo?`)) {
                                removerInscripcionMut.mutate(ins.jugador_id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title="Retirar jugador del torneo"
                          >
                            ✕ Retirar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Directorio General y Selección de Participantes */}
      {modalInscribir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-gray-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <span>📋</span> Directorio General — Seleccionar Participantes
                </h3>
                <p className="text-xs text-gray-500">
                  Chulea (marca) en la lista a los jugadores que participarán en este torneo
                </p>
              </div>
              <button
                onClick={() => setModalInscribir(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Buscador y Controles Rápidos */}
            <div className="space-y-2 mb-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={buscarJugador}
                  onChange={(e) => setBuscarJugador(e.target.value)}
                  placeholder="🔍 Buscar por nombre, apodo o club..."
                  className="input text-xs flex-1"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const todosDisponiblesIds = disponiblesParaInscribir.map((j) => j.id);
                      setSeleccionadosLote(todosDisponiblesIds);
                    }}
                    className="btn-outline text-xs text-primary-700 border-primary-300 py-1.5 px-2.5 whitespace-nowrap"
                  >
                    ✓ Chulear todos ({disponiblesParaInscribir.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeleccionadosLote([])}
                    className="btn-outline text-xs text-gray-600 border-gray-300 py-1.5 px-2.5 whitespace-nowrap"
                  >
                    ✕ Desmarcar
                  </button>
                </div>
              </div>
            </div>

            {/* Control Rápido de Handicap para este lote */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <div>
                  <span className="text-xs font-bold text-amber-950 block">Handicap de Carambolas:</span>
                  <span className="text-[11px] text-amber-800">
                    Define la meta de carambolas para los jugadores que inscribas (ej. 10, 12, 14, 15).
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <span className="text-xs font-bold text-amber-900 whitespace-nowrap">Meta para todos:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={handicapLoteDefault}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value);
                    setHandicapLoteDefault(val);
                    if (typeof val === 'number' && val > 0) {
                      const updated: Record<string, number> = { ...metasPorJugador };
                      seleccionadosLote.forEach((jId) => {
                        updated[jId] = val;
                      });
                      setMetasPorJugador(updated);
                    }
                  }}
                  placeholder={torneo?.meta_base ? `${torneo.meta_base}` : '14'}
                  className="w-16 text-center font-mono font-bold bg-white border border-amber-300 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
                <span className="text-xs font-bold text-amber-900">pts</span>
              </div>
            </div>

            {/* Listado de Jugadores con Checkboxes ("Chuleando") */}
            <div className="border border-gray-200 rounded-xl overflow-y-auto flex-1 divide-y divide-gray-100 min-h-[240px]">
              {todosJugadores.length === 0 ? (
                <p className="text-xs text-gray-400 p-8 text-center">
                  Cargando directorio de jugadores...
                </p>
              ) : (
                todosJugadores
                  .filter((j) => {
                    if (!buscarJugador.trim()) return true;
                    const q = buscarJugador.toLowerCase();
                    return (
                      j.nombre_completo.toLowerCase().includes(q) ||
                      (j.alias && j.alias.toLowerCase().includes(q)) ||
                      (j.club_ciudad && j.club_ciudad.toLowerCase().includes(q))
                    );
                  })
                  .map((j) => {
                    const yaInscrito = yaInscritosIds.has(j.id);
                    const estaSeleccionado = seleccionadosLote.includes(j.id);

                    return (
                      <label
                        key={j.id}
                        className={`flex items-center justify-between p-3 cursor-pointer text-xs transition select-none ${
                          yaInscrito
                            ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                            : estaSeleccionado
                            ? 'bg-emerald-50/80 font-semibold'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={yaInscrito}
                            checked={yaInscrito || estaSeleccionado}
                            onChange={(e) => {
                              if (yaInscrito) return;
                              if (e.target.checked) {
                                setSeleccionadosLote([...seleccionadosLote, j.id]);
                                if (typeof handicapLoteDefault === 'number' && handicapLoteDefault > 0) {
                                  setMetasPorJugador({
                                    ...metasPorJugador,
                                    [j.id]: handicapLoteDefault,
                                  });
                                }
                              } else {
                                setSeleccionadosLote(seleccionadosLote.filter((id) => id !== j.id));
                              }
                            }}
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                          <div>
                            <p className="text-gray-900 font-bold text-xs">
                              {j.nombre_completo}
                              {j.alias && <span className="text-gray-500 italic ml-1 font-normal">"{j.alias}"</span>}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {j.club_ciudad || 'Sin club'} • Promedio:{' '}
                              <span className="font-mono text-gray-600 font-bold">
                                {j.promedio_historico ? j.promedio_historico.toFixed(3) : '0.000'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {estaSeleccionado && !yaInscrito && (
                            <div
                              className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg px-2 py-0.5 shadow-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] text-gray-500 font-bold">Meta:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={metasPorJugador[j.id] ?? (typeof handicapLoteDefault === 'number' ? handicapLoteDefault : (torneo?.meta_base || 14))}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setMetasPorJugador({
                                    ...metasPorJugador,
                                    [j.id]: isNaN(val) ? 14 : val,
                                  });
                                }}
                                className="w-12 text-center font-mono font-black text-emerald-900 text-xs focus:outline-none"
                              />
                              <span className="text-[10px] text-emerald-700 font-bold">pts</span>
                            </div>
                          )}

                          {yaInscrito ? (
                            <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                              ✓ Ya Inscrito
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                estaSeleccionado
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {estaSeleccionado ? '✓ Seleccionado' : 'Chulear'}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })
              )}
            </div>

            {/* Footer con Contador y Acción de Inscribir */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-3">
              <span className="text-xs font-bold text-gray-700">
                🎯 {seleccionadosLote.length} jugadores chuleados para participar
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setModalInscribir(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => inscribirLoteMut.mutate({ jugador_ids: seleccionadosLote, metas: metasPorJugador })}
                  disabled={seleccionadosLote.length === 0 || inscribirLoteMut.isPending}
                  className="btn-primary text-xs flex items-center gap-1 font-bold"
                >
                  <span className="material-icons text-sm">person_add</span>
                  {inscribirLoteMut.isPending
                    ? 'Inscribiendo...'
                    : `Inscribir ${seleccionadosLote.length} Jugadores al Torneo`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

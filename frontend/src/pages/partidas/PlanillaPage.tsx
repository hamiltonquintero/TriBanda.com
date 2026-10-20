import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Planilla, FilaPlanilla } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function PlanillaPage() {
  const { id } = useParams<{ id: string }>();
  const { usuario, hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [setActivo, setSetActivo] = useState(1);

  const { data: planilla, isLoading } = useQuery<Planilla>({
    queryKey: ['planilla', id],
    queryFn: () => api.get(`/partidas/planilla/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.estado === 'en_curso' ? 5000 : false;
    },
  });

  const iniciar = useMutation({
    mutationFn: () => api.patch(`/partidas/${id}/iniciar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planilla', id] }),
  });

  const confirmar = useMutation({
    mutationFn: () => api.patch(`/partidas/${id}/confirmar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planilla', id] }),
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      // Finalizar cada set que tenga entradas
      const setsConDatos = planilla?.sets.filter((s) => s.filas.some((f) => f.carambolas_a !== null)) ?? [];
      for (const s of setsConDatos) {
        await api.patch(`/partidas/${id}/set/${s.numero}/finalizar`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planilla', id] }),
  });

  const [modalJuez, setModalJuez] = useState(false);
  const [juezNombreInput, setJuezNombreInput] = useState('');
  const [juezIdInput, setJuezIdInput] = useState('');

  const { data: jueces = [] } = useQuery<{ id: string; nombre: string; email: string; rol?: string }[]>({
    queryKey: ['jueces-oficiales'],
    queryFn: () => api.get('/auth/usuarios').then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: hasRole('admin', 'juez'),
  });

  const asignarJuez = useMutation({
    mutationFn: (data: { juez_id?: string | null; juez_nombre?: string | null }) =>
      api.patch(`/partidas/${id}/asignar-juez`, data),
    onSuccess: () => {
      setModalJuez(false);
      qc.invalidateQueries({ queryKey: ['planilla', id] });
      qc.invalidateQueries({ queryKey: ['marcador', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al asignar juez');
    },
  });

  const puedeEditar =
    planilla?.estado === 'en_curso' &&
    !planilla.confirmada &&
    (hasRole('admin') || (hasRole('juez') && planilla.encabezado.juez?.id === usuario?.id));

  const puedeConfirmar =
    planilla?.estado === 'finalizada' &&
    !planilla.confirmada &&
    (hasRole('admin') || (hasRole('juez') && planilla.encabezado.juez?.id === usuario?.id));

  if (isLoading) return <p className="text-gray-500 p-6">Cargando planilla...</p>;
  if (!planilla) return <p className="text-red-500 p-6">Planilla no encontrada</p>;

  const { encabezado, sets, resumen, estado, confirmada, ganador } = planilla;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Encabezado con datos completos de jugadores y protocolo */}
      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h1 className="text-xl font-bold font-heading">Planilla Oficial de Partida</h1>
              <span className="text-xs bg-gray-100 text-gray-700 font-medium px-2.5 py-1 rounded-full">
                Fase: <strong className="capitalize">{encabezado.fase.tipo}</strong>
              </span>
              <span className="text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium px-2.5 py-1 rounded-full">
                Desarrollado por <strong>Hamilton Quintero</strong>
              </span>
              {encabezado.modo_libre ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                  Libre de Entradas
                </span>
              ) : encabezado.limite_entradas ? (
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
                  Máx. {encabezado.limite_entradas} Entradas
                </span>
              ) : null}
            </div>


            {/* Fichas estilizadas de Jugador A y Jugador B */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Jugador A (Blanca) */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 relative shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border-2 border-gray-400 bg-white shadow-inner flex items-center justify-center text-xs" title="Bola Blanca">
                      ⚪
                    </span>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Jugador A {encabezado.jugador_salida_id === encabezado.jugador_a.id && '• Ganó Salida 🎯'}
                      </span>
                      <p className="font-bold text-gray-900 text-base leading-tight">
                        {encabezado.jugador_a.nombre} {encabezado.jugador_a.apellido}
                      </p>
                      {encabezado.jugador_a.alias && (
                        <p className="text-xs text-gray-500 italic">"{encabezado.jugador_a.alias}"</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs">
                  <span className="text-gray-600">🏛 {encabezado.jugador_a.club_ciudad || 'Sin Club'}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Meta: {encabezado.meta_a ?? 30} pts
                  </span>
                </div>
              </div>

              {/* Jugador B (Amarilla - Casilla Reglamentaria Amarilla) */}
              <div className="border-2 border-amber-300 rounded-xl p-3.5 bg-amber-50 relative shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-300 shadow-inner flex items-center justify-center text-xs" title="Bola Amarilla">
                      🟡
                    </span>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Jugador B (Fondo Amarillo) {encabezado.jugador_salida_id === encabezado.jugador_b.id && '• Ganó Salida 🎯'}
                      </span>
                      <p className="font-bold text-amber-950 text-base leading-tight">
                        {encabezado.jugador_b.nombre} {encabezado.jugador_b.apellido}
                      </p>
                      {encabezado.jugador_b.alias && (
                        <p className="text-xs text-amber-700 italic">"{encabezado.jugador_b.alias}"</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                  <span className="text-amber-900">🏛 {encabezado.jugador_b.club_ciudad || 'Sin Club'}</span>
                  <span className="font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">
                    Meta: {encabezado.meta_b ?? 30} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <strong>⚖️ Juez Oficial:</strong>
                <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200">
                  {encabezado.juez?.nombre || 'Sin juez asignado'}
                </span>
                {hasRole('admin', 'juez') && (
                  <button
                    type="button"
                    onClick={() => {
                      setJuezIdInput(encabezado.juez?.id || '');
                      setJuezNombreInput(encabezado.juez?.nombre || '');
                      setModalJuez(true);
                    }}
                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded transition"
                  >
                    ✏️ {encabezado.juez?.nombre ? 'Cambiar Juez' : 'Asignar Juez'}
                  </button>
                )}
              </div>
              <span><strong>Fecha:</strong> {encabezado.fecha ? new Date(encabezado.fecha).toLocaleDateString('es-CO') : 'Sin fecha'}</span>
            </div>
          </div>

          {/* Modal para cambiar juez en planilla */}
          {modalJuez && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm border border-gray-100">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <span>⚖️</span> Asignar / Cambiar Juez Oficial
                  </h4>
                  <button onClick={() => setModalJuez(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
                </div>

                <div className="space-y-3 mb-4">
                  {jueces.length > 0 && (
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Jueces del sistema:</label>
                      <select
                        value={juezIdInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJuezIdInput(val);
                          const sel = jueces.find((u) => u.id === val);
                          if (sel) setJuezNombreInput(sel.nombre);
                        }}
                        className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Seleccionar de la lista --</option>
                        {jueces.map((u) => (
                          <option key={u.id} value={u.id}>{u.nombre} ({u.rol === 'juez' ? 'Juez' : u.rol})</option>
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
                      value={juezNombreInput}
                      onChange={(e) => {
                        setJuezNombreInput(e.target.value);
                        if (juezIdInput) setJuezIdInput('');
                      }}
                      placeholder="Escribe el nombre del juez..."
                      className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModalJuez(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
                  <button
                    onClick={() => asignarJuez.mutate({ juez_id: juezIdInput || null, juez_nombre: juezNombreInput || null })}
                    disabled={asignarJuez.isPending}
                    className="btn-primary text-xs py-1.5"
                  >
                    {asignarJuez.isPending ? 'Guardando...' : 'Guardar Juez'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:items-end gap-2">
            <EstadoBadge estado={estado} confirmada={confirmada} />
            {estado === 'pendiente' && hasRole('admin', 'juez') && (
              <button
                onClick={() => iniciar.mutate()}
                disabled={iniciar.isPending}
                className="btn-primary"
              >
                {iniciar.isPending ? 'Iniciando...' : '▶ Iniciar partida'}
              </button>
            )}
            {estado === 'en_curso' && puedeEditar && (
              <button
                onClick={() => finalizar.mutate()}
                disabled={finalizar.isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
              >
                {finalizar.isPending ? 'Finalizando...' : '⏹ Finalizar partida'}
              </button>
            )}
            {puedeConfirmar && (
              <button
                onClick={() => confirmar.mutate()}
                disabled={confirmar.isPending}
                className="btn-primary"
              >
                {confirmar.isPending ? 'Confirmando...' : '✓ Confirmar resultado'}
              </button>
            )}
          </div>
        </div>

        {/* Ganador */}
        {ganador && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700 font-semibold text-lg">
              🏆 Ganador: {ganador.nombre_completo}
            </p>
          </div>
        )}
      </div>

      {/* Tabs de sets */}
      {sets.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1 mb-4">
            {[1, 2, 3].map((n) => {
              const set = sets.find((s) => s.numero === n);
              return (
                <button
                  key={n}
                  onClick={() => setSetActivo(n)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    setActivo === n
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 border hover:bg-gray-50'
                  }`}
                >
                  Set {n}
                  {set?.ganador_id && (
                    <span className="ml-1 text-xs">
                      {set.ganador_id === encabezado.jugador_a.id ? '(A)' : '(B)'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {sets.map((set) =>
            set.numero === setActivo ? (
              <SetTabla
                key={set.id ?? set.numero}
                set={set}
                jugadorA={encabezado.jugador_a}
                jugadorB={encabezado.jugador_b}
                partidaId={id!}
                puedeEditar={puedeEditar}
                onGuardado={() => qc.invalidateQueries({ queryKey: ['planilla', id] })}
              />
            ) : null
          )}
        </>
      )}

      {/* Resumen final */}
      {(estado === 'finalizada' || sets.some((s) => s.filas.some((f) => f.carambolas_a !== null))) && (
        <div className="bg-white rounded-xl shadow p-5 mt-4">
          <h2 className="font-semibold text-lg mb-3">Resumen final</h2>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left pb-2">Campo</th>
                <th className="text-center pb-2">{encabezado.jugador_a.nombre_completo}</th>
                <th className="text-center pb-2">{encabezado.jugador_b.nombre_completo}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 text-gray-600">Total Carambolas</td>
                <td className="py-2 text-center font-bold">{resumen.total_carambolas_a}</td>
                <td className="py-2 text-center font-bold">{resumen.total_carambolas_b}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-600">Total Entradas</td>
                <td className="py-2 text-center">{resumen.total_entradas_a}</td>
                <td className="py-2 text-center">{resumen.total_entradas_b}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-600">Sets Ganados</td>
                <td className="py-2 text-center font-bold text-green-600">{resumen.sets_ganados_a}</td>
                <td className="py-2 text-center font-bold text-green-600">{resumen.sets_ganados_b}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Promedio</td>
                <td className="py-2 text-center">{resumen.promedio_a.toFixed(3)}</td>
                <td className="py-2 text-center">{resumen.promedio_b.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE SET TABLA ────────────────────────────────────────────────────

interface SetTablaProps {
  set: Planilla['sets'][0];
  jugadorA: Planilla['encabezado']['jugador_a'];
  jugadorB: Planilla['encabezado']['jugador_b'];
  partidaId: string;
  puedeEditar: boolean;
  onGuardado: () => void;
}

function SetTabla({ set, jugadorA, jugadorB, partidaId, puedeEditar, onGuardado }: SetTablaProps) {
  // Estado local para la entrada que se está editando
  const [entradaActual, setEntradaActual] = useState<number | null>(null);
  const [carA, setCarA] = useState('');
  const [carB, setCarB] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calcular totales acumulados en tiempo real (incluyendo edición local)
  function calcularFilas(): FilaPlanilla[] {
    return set.filas.map((fila) => {
      if (entradaActual === fila.numero_entrada) {
        // Mostrar preview de la entrada en edición
        const carANum = parseInt(carA) || 0;
        const carBNum = parseInt(carB) || 0;
        const prevA = set.filas
          .filter((f) => f.numero_entrada < fila.numero_entrada && f.carambolas_a !== null)
          .reduce((acc, f) => acc + (f.carambolas_a ?? 0), 0);
        const prevB = set.filas
          .filter((f) => f.numero_entrada < fila.numero_entrada && f.carambolas_b !== null)
          .reduce((acc, f) => acc + (f.carambolas_b ?? 0), 0);
        return {
          ...fila,
          carambolas_a: carANum,
          total_a: prevA + carANum,
          carambolas_b: carBNum,
          total_b: prevB + carBNum,
        };
      }
      return fila;
    });
  }

  async function guardarEntrada() {
    if (entradaActual === null) return;
    const carANum = parseInt(carA);
    const carBNum = parseInt(carB);
    if (isNaN(carANum) || carANum < 0 || isNaN(carBNum) || carBNum < 0) {
      setErrorMsg('Las carambolas deben ser números >= 0');
      return;
    }
    setGuardando(true);
    setErrorMsg('');
    try {
      await api.post(`/partidas/${partidaId}/entrada`, {
        set_numero: set.numero,
        numero_entrada: entradaActual,
        carambolas_a: carANum,
        carambolas_b: carBNum,
      });
      setEntradaActual(null);
      setCarA('');
      setCarB('');
      onGuardado();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  function seleccionarEntrada(num: number) {
    if (!puedeEditar) return;
    const fila = set.filas.find((f) => f.numero_entrada === num);
    setEntradaActual(num);
    setCarA(fila?.carambolas_a?.toString() ?? '');
    setCarB(fila?.carambolas_b?.toString() ?? '');
    setErrorMsg('');
  }

  const filas = calcularFilas();

  return (
      <div className="bg-white rounded-xl shadow p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="font-semibold text-lg">Set {set.numero}</h2>
        {set.ganador_id && (
          <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Ganador: {set.ganador_id === jugadorA.id ? jugadorA.nombre_completo : jugadorB.nombre_completo}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full min-w-[580px] text-sm">
          <thead>
            {/* Fila superior de grupos de jugador */}
            <tr className="border-b text-xs uppercase tracking-wider text-center">
              <th className="py-2.5 px-3 bg-gray-100 text-gray-600 font-bold w-16 border-r border-gray-200">
                #
              </th>
              <th colSpan={2} className="py-2.5 px-3 bg-white text-gray-800 font-bold border-r border-gray-200">
                ⚪ Jugador A: {jugadorA.nombre} {jugadorA.apellido}
              </th>
              <th colSpan={2} className="py-2.5 px-3 bg-amber-100 text-amber-950 font-bold border-r border-amber-300">
                🟡 Jugador B: {jugadorB.nombre} {jugadorB.apellido}
              </th>
              {puedeEditar && <th className="bg-gray-50 w-12"></th>}
            </tr>
            {/* Fila de columnas de métricas */}
            <tr className="border-b text-xs font-semibold text-gray-600">
              <th className="text-center py-2 bg-gray-50 border-r border-gray-200">Entrada</th>
              <th className="text-center py-2 px-2 bg-white">Parcial</th>
              <th className="text-center py-2 px-2 bg-white border-r border-gray-200">Total</th>
              <th className="text-center py-2 px-2 bg-amber-50 text-amber-900 border-l border-amber-200">Parcial</th>
              <th className="text-center py-2 px-2 bg-amber-50 text-amber-900 border-r border-amber-200">Total</th>
              {puedeEditar && <th className="bg-gray-50 text-center py-2">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const esActual = entradaActual === fila.numero_entrada;
              return (
                <tr
                  key={fila.numero_entrada}
                  className={`border-b last:border-0 transition ${
                    esActual ? 'bg-primary-50' : puedeEditar ? 'hover:bg-gray-50 cursor-pointer' : ''
                  }`}
                  onClick={() => !esActual && seleccionarEntrada(fila.numero_entrada)}
                >
                  <td className="py-2 text-center font-bold text-gray-700 bg-gray-50/60 border-r border-gray-200">
                    {fila.numero_entrada}
                  </td>

                  {esActual ? (
                    <>
                      {/* Edición Jugador A */}
                      <td className="py-1 px-1 text-center bg-white">
                        <input
                          type="number"
                          min={0}
                          value={carA}
                          onChange={(e) => setCarA(e.target.value)}
                          className="input text-center w-18 h-8 font-bold"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 text-center text-gray-400 font-semibold border-r border-gray-200 bg-white">
                        {fila.total_a ?? '—'}
                      </td>

                      {/* Edición Jugador B (Amarillo tenue) */}
                      <td className="py-1 px-1 text-center bg-amber-50/80 border-l border-amber-200">
                        <input
                          type="number"
                          min={0}
                          value={carB}
                          onChange={(e) => setCarB(e.target.value)}
                          className="input text-center w-18 h-8 font-bold border-amber-400 bg-amber-100/50 text-amber-950 focus:ring-amber-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 text-center text-amber-800 font-semibold border-r border-amber-200 bg-amber-50/80">
                        {fila.total_b ?? '—'}
                      </td>

                      <td className="py-1 px-2 text-center bg-gray-50">
                        <button
                          onClick={(e) => { e.stopPropagation(); guardarEntrada(); }}
                          disabled={guardando}
                          className="btn-primary text-xs px-2.5 py-1 font-bold"
                          title="Guardar esta entrada"
                        >
                          {guardando ? '...' : '✓'}
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Vista Jugador A */}
                      <td className="py-2 text-center text-gray-800 font-medium bg-white">
                        {fila.carambolas_a !== null ? fila.carambolas_a : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2 text-center font-bold text-gray-900 border-r border-gray-200 bg-white">
                        {fila.total_a !== null ? fila.total_a : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Vista Jugador B (Casillas Amarillas Reglamentarias) */}
                      <td className="py-2 text-center font-medium bg-amber-50/70 text-amber-950 border-l border-amber-200/60">
                        {fila.carambolas_b !== null ? fila.carambolas_b : <span className="text-amber-300">—</span>}
                      </td>
                      <td className="py-2 text-center font-bold text-amber-950 border-r border-amber-200/60 bg-amber-100/60">
                        {fila.total_b !== null ? fila.total_b : <span className="text-amber-300">—</span>}
                      </td>

                      {puedeEditar && <td className="bg-gray-50/40 text-center text-xs text-gray-400 hover:text-primary-600">✎</td>}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {errorMsg && <p className="error mt-2">{errorMsg}</p>}

      {puedeEditar && entradaActual === null && (
        <p className="text-xs text-gray-400 mt-2">
          Haz clic en una fila para registrar o editar la entrada.
        </p>
      )}

      {entradaActual !== null && (
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <button
            onClick={guardarEntrada}
            disabled={guardando}
            className="btn-primary"
          >
            {guardando ? 'Guardando...' : 'Guardar entrada'}
          </button>
          <button
            onClick={() => { setEntradaActual(null); setCarA(''); setCarB(''); setErrorMsg(''); }}
            className="btn-secondary"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── BADGE ESTADO ────────────────────────────────────────────────────────────

function EstadoBadge({ estado, confirmada }: { estado: string; confirmada: boolean }) {
  if (confirmada) {
    return (
      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
        ✓ Confirmada
      </span>
    );
  }
  const map: Record<string, string> = {
    pendiente: 'bg-gray-100 text-gray-600',
    en_curso: 'bg-yellow-100 text-yellow-700',
    finalizada: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-medium ${map[estado] ?? ''}`}>
      {estado}
    </span>
  );
}

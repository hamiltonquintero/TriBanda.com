import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Grupo, Jugador } from '../../types';

export default function AsignarJugadoresPage() {
  const { torneoId, faseId, id } = useParams<{ torneoId: string; faseId: string; id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [filtro, setFiltro] = useState('');
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [generandoSiguiente, setGenerandoSiguiente] = useState(false);

  const { data: grupo } = useQuery<Grupo>({
    queryKey: ['grupo', id],
    queryFn: () => api.get(`/grupos/${faseId}/${id}`).then((r) => r.data),
  });

  const { data: todosJugadores = [] } = useQuery<Jugador[]>({
    queryKey: ['jugadores-activos'],
    queryFn: () => api.get('/jugadores?activo=true').then((r) => r.data),
  });

  const { data: grupos = [] } = useQuery<Grupo[]>({
    queryKey: ['grupos', faseId],
    queryFn: () => api.get(`/grupos/${faseId}`).then((r) => r.data),
  });

  // Pre-cargar jugadores ya asignados a este grupo
  useEffect(() => {
    if (grupo?.jugadores) {
      setSeleccionados(grupo.jugadores.map((gj) => gj.jugador_id));
    }
  }, [grupo]);

  // Jugadores ya asignados a OTROS grupos de la misma fase
  const asignadosEnOtrosGrupos = new Set<string>();
  grupos.forEach((g) => {
    if (g.id !== id) {
      g.jugadores?.forEach((gj) => asignadosEnOtrosGrupos.add(gj.jugador_id));
    }
  });

  function toggleJugador(jugador_id: string) {
    setSeleccionados((prev) =>
      prev.includes(jugador_id)
        ? prev.filter((j) => j !== jugador_id)
        : [...prev, jugador_id]
    );
  }

  const asignar = useMutation({
    mutationFn: (jugador_ids: string[]) =>
      api.put(`/grupos/${id}/jugadores`, { jugador_ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo', id] });
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['clasificados-fase', faseId] });
      navigate(`/torneos/${torneoId}/fases/${faseId}/grupos`);
    },
  });

  async function guardarYCrearSiguiente() {
    try {
      setGenerandoSiguiente(true);
      // 1. Guardar asignación actual
      await api.put(`/grupos/${id}/jugadores`, { jugador_ids: seleccionados });

      // 2. Determinar número y letra para el siguiente grupo
      const maxNum = grupos.reduce((max, g) => Math.max(max, g.numero), 0);
      const siguienteNumero = maxNum + 1;
      const siguienteLetra = String.fromCharCode(65 + (siguienteNumero - 1)); // A, B, C...

      // 3. Crear el nuevo grupo
      const res = await api.post('/grupos', {
        fase_id: faseId,
        numero: siguienteNumero,
        letra: siguienteLetra,
      });

      const nuevoGrupo = res.data;
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['clasificados-fase', faseId] });

      // 4. Navegar a asignar el nuevo grupo
      navigate(`/torneos/${torneoId}/fases/${faseId}/grupos/${nuevoGrupo.id}/asignar`);
      setSeleccionados([]);
      setFiltro('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al crear siguiente grupo');
    } finally {
      setGenerandoSiguiente(false);
    }
  }

  const jugadoresFiltrados = todosJugadores.filter((j) => {
    if (!filtro.trim()) return true;
    const term = filtro.toLowerCase();
    return (
      j.nombre_completo.toLowerCase().includes(term) ||
      (j.alias && j.alias.toLowerCase().includes(term)) ||
      (j.club_ciudad && j.club_ciudad.toLowerCase().includes(term)) ||
      (j.club?.nombre && j.club.nombre.toLowerCase().includes(term))
    );
  });

  const valido = seleccionados.length >= 2 && seleccionados.length <= 6;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <Link
            to={`/torneos/${torneoId}/fases/${faseId}/grupos`}
            className="text-xs text-primary-600 hover:underline"
          >
            ← Volver a grupos
          </Link>
          <h1 className="text-xl font-bold font-heading text-gray-900 mt-0.5">
            Asignar Jugadores — Grupo {grupo?.numero} {grupo?.letra ? `(${grupo.letra})` : ''}
          </h1>
          <p className="text-xs text-gray-500">
            Reglamento Billar: Selecciona entre 2 y 6 jugadores (recomendado: 3 para triangular).
          </p>
        </div>
        <span className="badge-primary px-3 py-1 font-bold text-xs">
          {seleccionados.length} Seleccionado(s)
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Buscador de jugadores */}
        <div>
          <div className="relative">
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="🔍 Buscar por nombre, alias o club..."
              className="input pl-9 text-sm"
            />
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lista con números 1, 2, 3... */}
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {jugadoresFiltrados.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No se encontraron jugadores.</p>
          ) : (
            jugadoresFiltrados.map((j, idx) => {
              const enOtroGrupo = asignadosEnOtrosGrupos.has(j.id);
              const checked = seleccionados.includes(j.id);
              return (
                <label
                  key={j.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer text-sm
                    ${enOtroGrupo ? 'opacity-40 bg-gray-50 border-gray-200 cursor-not-allowed' : 'hover:border-primary-300 hover:bg-gray-50'}
                    ${checked ? 'bg-primary-50 border-primary-500 font-semibold shadow-2xs' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-6 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={enOtroGrupo}
                      onChange={() => !enOtroGrupo && toggleJugador(j.id)}
                      className="accent-primary-600 w-4 h-4 rounded cursor-pointer"
                    />
                    <div>
                      <p className="text-gray-900 leading-tight">
                        {j.nombre_completo}
                        {j.alias && <span className="text-primary-600 text-xs ml-1 font-normal">"{j.alias}"</span>}
                      </p>
                      <p className="text-xs text-gray-400 font-normal">
                        {j.club?.nombre ?? j.club_ciudad}
                        {enOtroGrupo && <span className="text-red-500 font-medium ml-1.5">(Asignado a otro grupo)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-primary-700 font-mono font-bold">
                      {j.promedio_historico ? j.promedio_historico.toFixed(3) : '0.000'}
                    </span>
                    <span className="text-gray-400 block text-[10px]">Promedio</span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Acciones */}
        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className={`text-xs ${valido ? 'text-green-700 font-medium' : 'text-amber-600'}`}>
            {valido ? `✓ ${seleccionados.length} jugadores asignados` : `⚠️ Selecciona entre 2 y 6 jugadores (${seleccionados.length} elegidos)`}
          </p>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => asignar.mutate(seleccionados)}
              disabled={!valido || asignar.isPending || generandoSiguiente}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <span className="material-icons text-sm">save</span>
              {asignar.isPending ? 'Guardando...' : 'Guardar y volver'}
            </button>

            <button
              type="button"
              onClick={guardarYCrearSiguiente}
              disabled={!valido || asignar.isPending || generandoSiguiente}
              className="btn-primary text-xs flex items-center gap-1 shadow-sm"
              title="Guarda este grupo y abre inmediatamente la selección para el siguiente"
            >
              <span>{generandoSiguiente ? 'Creando...' : 'Guardar y Crear Siguiente Grupo ➡️'}</span>
            </button>
          </div>
        </div>

        {asignar.isError && (
          <p className="error text-xs">
            {(asignar.error as any)?.response?.data?.error ?? 'Error al guardar asignación'}
          </p>
        )}
      </div>
    </div>
  );
}

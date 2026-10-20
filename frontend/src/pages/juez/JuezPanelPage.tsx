import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Partida, Torneo } from '../../types';

export default function JuezPanelPage() {
  const { usuario } = useAuthStore();
  const qc = useQueryClient();
  const [modalCorreccion, setModalCorreccion] = useState<Partida | null>(null);
  const [motivo, setMotivo] = useState('');

  // Obtener torneos activos
  const { data: torneos = [] } = useQuery<Torneo[]>({
    queryKey: ['torneos-juez'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
  });

  const torneosActivos = torneos.filter((t) => t.estado === 'activo');

  const solicitarCorreccionMutation = useMutation({
    mutationFn: ({ partidaId, motivo }: { partidaId: string; motivo: string }) =>
      api.post(`/partidas/${partidaId}/solicitar-correccion`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juez-partidas'] });
      setModalCorreccion(null);
      setMotivo('');
      alert('Solicitud de corrección enviada al Administrador.');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header del juez */}
      <div className="card-dark" style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1a4a1a 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-icons text-3xl text-accent-400">gavel</span>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-white">Panel del Juez</h1>
            <p className="text-green-200/80">{usuario?.nombre} ({usuario?.email})</p>
          </div>
        </div>
      </div>

      {/* Torneos activos */}
      {torneosActivos.length === 0 ? (
        <div className="card-flat text-center py-12">
          <span className="material-icons text-5xl text-gray-300 block mb-3">sports_score</span>
          <p className="text-gray-500">No hay torneos activos en este momento</p>
        </div>
      ) : (
        torneosActivos.map((torneo) => (
          <JuezTorneoSection
            key={torneo.id}
            torneo={torneo}
            juezId={usuario?.id}
            onSolicitarCorreccion={(p) => setModalCorreccion(p)}
          />
        ))
      )}

      {/* Modal solicitar corrección */}
      {modalCorreccion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
              <span className="material-icons text-amber-500 align-middle mr-1">edit_note</span>
              Solicitar Corrección al Administrador
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              La partida entre <strong>{modalCorreccion.jugador_a?.nombre_completo}</strong> y <strong>{modalCorreccion.jugador_b?.nombre_completo}</strong> está confirmada y bloqueada. Explique qué dato necesita corregir para que el administrador autorice la reapertura.
            </p>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Se anotaron 2 carambolas de más en la entrada 7 para el jugador A..."
              className="input w-full h-24 mb-4 text-sm"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setModalCorreccion(null)} className="btn-secondary text-xs">
                Cancelar
              </button>
              <button
                onClick={() => solicitarCorreccionMutation.mutate({ partidaId: modalCorreccion.id, motivo })}
                disabled={!motivo.trim() || solicitarCorreccionMutation.isPending}
                className="btn-primary text-xs"
              >
                {solicitarCorreccionMutation.isPending ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JuezTorneoSection({
  torneo,
  juezId,
  onSolicitarCorreccion,
}: {
  torneo: Torneo;
  juezId?: string;
  onSolicitarCorreccion: (p: Partida) => void;
}) {
  const { data: partidas = [] } = useQuery<Partida[]>({
    queryKey: ['juez-partidas', torneo.id],
    queryFn: () => api.get(`/partidas/torneo/${torneo.id}`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const misPartidas = partidas.filter((p) => p.juez_id === juezId || !p.juez_id);

  const pendientes = misPartidas.filter((p) => p.estado === 'pendiente');
  const enCurso = misPartidas.filter((p) => p.estado === 'en_curso');
  const finalizadas = misPartidas.filter((p) => p.estado === 'finalizada' && !p.confirmada);
  const confirmadas = misPartidas.filter((p) => p.confirmada);

  return (
    <div className="card space-y-4">
      <h2 className="font-heading font-bold text-lg">
        <span className="material-icons text-primary-600 align-middle mr-2 text-xl">emoji_events</span>
        {torneo.nombre}
      </h2>

      {/* Partidas en curso — prioridad máxima */}
      {enCurso.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-icons text-xs">play_circle</span>
            En curso ({enCurso.length})
          </h3>
          <div className="space-y-2">
            {enCurso.map((p) => (
              <PartidaCard key={p.id} partida={p} accion="marcador" />
            ))}
          </div>
        </div>
      )}

      {/* Por confirmar */}
      {finalizadas.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-icons text-xs">check_circle</span>
            Por confirmar ({finalizadas.length})
          </h3>
          <div className="space-y-2">
            {finalizadas.map((p) => (
              <PartidaCard key={p.id} partida={p} accion="confirmar" />
            ))}
          </div>
        </div>
      )}

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-icons text-xs">schedule</span>
            Pendientes ({pendientes.length})
          </h3>
          <div className="space-y-2">
            {pendientes.map((p) => (
              <PartidaCard key={p.id} partida={p} accion="iniciar" />
            ))}
          </div>
        </div>
      )}

      {/* Confirmadas y Bloqueadas */}
      {confirmadas.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-icons text-xs">lock</span>
            Confirmadas y Bloqueadas ({confirmadas.length})
          </h3>
          <div className="space-y-2">
            {confirmadas.slice(0, 10).map((p) => (
              <PartidaCard
                key={p.id}
                partida={p}
                accion="ver"
                onSolicitarCorreccion={() => onSolicitarCorreccion(p)}
              />
            ))}
          </div>
        </div>
      )}

      {misPartidas.length === 0 && (
        <p className="text-gray-400 text-sm">No tienes partidas asignadas en este torneo.</p>
      )}
    </div>
  );
}

const estadoColor: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_curso: 'bg-amber-100 text-amber-700',
  finalizada: 'bg-green-100 text-green-700',
};

function PartidaCard({
  partida,
  accion,
  onSolicitarCorreccion,
}: {
  partida: Partida;
  accion: 'marcador' | 'confirmar' | 'iniciar' | 'ver';
  onSolicitarCorreccion?: () => void;
}) {
  const btnMap = {
    marcador: { to: `/partidas/${partida.id}/marcador`, label: 'Marcador Digital', icon: 'sports_score', cls: 'btn-secondary' },
    confirmar: { to: `/partidas/${partida.id}/planilla`, label: 'Confirmar Planilla', icon: 'check', cls: 'btn-primary' },
    iniciar: { to: `/partidas/${partida.id}/marcador`, label: 'Iniciar', icon: 'play_arrow', cls: 'btn-primary' },
    ver: { to: `/partidas/${partida.id}/planilla`, label: 'Ver Planilla', icon: 'visibility', cls: 'btn-outline text-gray-700 border-gray-300' },
  };
  const btn = btnMap[accion];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-900">{partida.jugador_a?.nombre_completo}</span>
          <span className="text-gray-400 text-xs">vs</span>
          <span className="font-semibold text-gray-900">{partida.jugador_b?.nombre_completo}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${partida.confirmada ? 'bg-blue-100 text-blue-800' : estadoColor[partida.estado]}`}>
            {partida.confirmada ? '🔒 Confirmada' : partida.estado}
          </span>
          {partida.solicitud_reapertura && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full animate-pulse">
              ⏳ Corrección solicitada
            </span>
          )}
          {partida.ganador && (
            <span className="text-xs text-green-700 font-medium">🏆 Ganador: {partida.ganador.nombre_completo}</span>
          )}
          {partida.grupo && (
            <span className="text-[10px] text-gray-400">Grupo {partida.grupo.numero}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {partida.confirmada && onSolicitarCorreccion && (
          <button
            onClick={onSolicitarCorreccion}
            disabled={partida.solicitud_reapertura}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              partida.solicitud_reapertura
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-amber-700 border-amber-300 hover:bg-amber-50'
            }`}
          >
            {partida.solicitud_reapertura ? 'Esperando Admin' : 'Solicitar Corrección'}
          </button>
        )}
        <Link to={btn.to} className={`${btn.cls} text-xs inline-flex items-center gap-1`}>
          <span className="material-icons text-sm">{btn.icon}</span>
          {btn.label}
        </Link>
      </div>
    </div>
  );
}

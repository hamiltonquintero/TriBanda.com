import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import { Jugador, Fase, Grupo, Usuario } from '../../types';

const schema = z.object({
  fase_id: z.string().uuid('Selecciona una fase'),
  grupo_id: z.string().optional(),
  jugador_a_id: z.string().uuid('Selecciona el jugador A'),
  jugador_b_id: z.string().uuid('Selecciona el jugador B'),
  juez_id: z.string().optional(),
  fecha: z.string().optional(),
  hora: z.string().optional(),
  total_sets: z.coerce.number().int().min(1).max(3),
}).refine((d) => d.jugador_a_id !== d.jugador_b_id, {
  message: 'Jugador A y Jugador B no pueden ser el mismo',
  path: ['jugador_b_id'],
});

type FormData = z.infer<typeof schema>;

export default function NuevaPartidaPage() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { total_sets: 3 },
  });

  const faseId = watch('fase_id');

  const { data: fases } = useQuery<Fase[]>({
    queryKey: ['fases', torneoId],
    queryFn: () => api.get(`/torneos/${torneoId}/fases`).then((r) => r.data),
  });

  const { data: grupos } = useQuery<Grupo[]>({
    queryKey: ['grupos', faseId],
    queryFn: () => api.get(`/grupos/${faseId}`).then((r) => r.data),
    enabled: !!faseId,
  });

  const { data: jugadores } = useQuery<Jugador[]>({
    queryKey: ['jugadores-activos'],
    queryFn: () => api.get('/jugadores?activo=true').then((r) => r.data),
  });

  const { data: jueces } = useQuery<Usuario[]>({
    queryKey: ['jueces'],
    queryFn: () => api.get('/auth/usuarios?rol=juez').then((r) => r.data),
  });

  const crear = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        grupo_id: data.grupo_id || undefined,
        juez_id: data.juez_id || undefined,
        fecha: data.fecha ? new Date(data.fecha).toISOString() : undefined,
        hora: data.hora || undefined,
      };
      return api.post('/partidas', payload);
    },
    onSuccess: () => navigate(`/torneos/${torneoId}/partidas`),
  });

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link to={`/torneos/${torneoId}/partidas`} className="text-sm text-primary-600 hover:underline">← Volver a partidas</Link>
        <h1 className="text-2xl font-bold mt-1">Nueva partida</h1>
      </div>

      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="label">Fase *</label>
          <select {...register('fase_id')} className="input">
            <option value="">Seleccionar fase...</option>
            {fases?.map((f) => <option key={f.id} value={f.id}>Fase {f.orden} — {f.tipo}</option>)}
          </select>
          {errors.fase_id && <p className="error">{errors.fase_id.message}</p>}
        </div>

        <div>
          <label className="label">Grupo (opcional)</label>
          <select {...register('grupo_id')} className="input">
            <option value="">Sin grupo</option>
            {grupos?.map((g) => <option key={g.id} value={g.id}>Grupo {g.numero}{g.letra ? ` — ${g.letra}` : ''}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Jugador A *</label>
          <select {...register('jugador_a_id')} className="input">
            <option value="">Seleccionar...</option>
            {jugadores?.map((j) => <option key={j.id} value={j.id}>{j.nombre_completo}</option>)}
          </select>
          {errors.jugador_a_id && <p className="error">{errors.jugador_a_id.message}</p>}
        </div>

        <div>
          <label className="label">Jugador B *</label>
          <select {...register('jugador_b_id')} className="input">
            <option value="">Seleccionar...</option>
            {jugadores?.map((j) => <option key={j.id} value={j.id}>{j.nombre_completo}</option>)}
          </select>
          {errors.jugador_b_id && <p className="error">{errors.jugador_b_id.message}</p>}
        </div>

        <div>
          <label className="label">Juez (opcional)</label>
          <select {...register('juez_id')} className="input">
            <option value="">Sin juez asignado</option>
            {jueces?.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Sets por partida *</label>
          <select {...register('total_sets')} className="input">
            <option value={1}>1 set</option>
            <option value={2}>2 sets</option>
            <option value={3}>3 sets (estándar)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha (opcional)</label>
            <input type="date" {...register('fecha')} className="input" />
          </div>
          <div>
            <label className="label">Hora (opcional)</label>
            <input type="time" {...register('hora')} className="input" />
          </div>
        </div>

        {crear.isError && <p className="error">{(crear.error as any)?.response?.data?.error ?? 'Error al crear'}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <Link to={`/torneos/${torneoId}/partidas`} className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={crear.isPending} className="btn-primary">
            {crear.isPending ? 'Creando...' : 'Crear partida'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Fase, Torneo } from '../../types';

const schema = z.object({
  tipo: z.enum(['grupos', 'clasificatorio', 'llaves', 'final']),
  fecha: z.string().min(1, 'Fecha requerida'),
  orden: z.coerce.number().int().min(1),
});
type Form = z.infer<typeof schema>;

function toInputDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function NuevaFasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: torneo, isLoading: loadingTorneo } = useQuery<Torneo>({
    queryKey: ['torneo', id],
    queryFn: () => api.get(`/torneos/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: fases = [] } = useQuery<Fase[]>({
    queryKey: ['fases', id],
    queryFn: () => api.get(`/torneos/${id}/fases`).then((r) => r.data),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { orden: 1, tipo: 'grupos' },
  });

  useEffect(() => {
    const nextOrden = fases.length > 0 ? Math.max(...fases.map((f) => f.orden)) + 1 : 1;
    const fechaBase = torneo ? toInputDate(torneo.fecha_inicio) : '';
    reset((prev) => ({
      ...prev,
      orden: nextOrden,
      fecha: fechaBase || prev.fecha,
    }));
  }, [fases, torneo, reset]);

  async function onSubmit(data: Form) {
    try {
      await api.post(`/torneos/${id}/fases`, {
        ...data,
        fecha: new Date(data.fecha).toISOString(),
      });
      navigate(`/torneos/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al crear fase';
      setError('root', { message: msg });
    }
  }

  if (loadingTorneo || !torneo) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nueva fase</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-6 space-y-4">

        <div>
          <label className="label">Tipo de fase *</label>
          <select {...register('tipo')} className="input">
            <option value="grupos">Grupos</option>
            <option value="clasificatorio">Clasificatorio</option>
            <option value="llaves">Llaves</option>
            <option value="final">Final</option>
          </select>
          {errors.tipo && <p className="error">{errors.tipo.message}</p>}
        </div>

        <div>
          <label className="label">Fecha *</label>
          <input {...register('fecha')} type="date" className="input" />
          {errors.fecha && <p className="error">{errors.fecha.message}</p>}
        </div>

        <div>
          <label className="label">Orden *</label>
          <input {...register('orden')} type="number" min={1} className="input" />
          {errors.orden && <p className="error">{errors.orden.message}</p>}
        </div>

        {errors.root && <p className="error text-center">{errors.root.message}</p>}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Guardando...' : 'Crear fase'}
          </button>
        </div>
      </form>
    </div>
  );
}

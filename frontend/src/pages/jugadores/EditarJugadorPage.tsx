import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Club, Jugador } from '../../types';

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  apellido: z.string().min(2, 'Apellido requerido'),
  alias: z.string().optional(),
  cedula: z.string().optional(),
  celular: z.string().optional(),
  ciudad: z.string().optional(),
  pais: z.string().optional(),
  club_ciudad: z.string().min(1, 'Club o ciudad requerido'),
  categoria: z.string().optional(),
  foto_url: z.string().optional(),
  club_id: z.string().optional(),
  activo: z.boolean(),
});
type Form = z.infer<typeof schema>;

export default function EditarJugadorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: clubes = [] } = useQuery<Club[]>({
    queryKey: ['clubes'],
    queryFn: () => api.get('/jugadores/clubes').then((r) => r.data),
  });

  const { data: jugador, isLoading } = useQuery<Jugador>({
    queryKey: ['jugador', id],
    queryFn: () => api.get(`/jugadores/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { activo: true },
  });

  useEffect(() => {
    if (!jugador) return;
    reset({
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      alias: jugador.alias ?? '',
      cedula: jugador.cedula ?? '',
      celular: jugador.celular ?? '',
      ciudad: jugador.ciudad ?? '',
      pais: jugador.pais ?? '',
      club_ciudad: jugador.club_ciudad,
      categoria: jugador.categoria ?? '',
      foto_url: jugador.foto_url ?? '',
      club_id: jugador.club?.id ?? '',
      activo: jugador.activo,
    });
  }, [jugador, reset]);

  async function onSubmit(data: Form) {
    try {
      const payload = {
        ...data,
        club_id: data.club_id || undefined,
      };
      await api.put(`/jugadores/${id}`, payload);
      navigate(`/jugadores/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar';
      setError('root', { message: msg });
    }
  }

  if (isLoading || !jugador) return <p className="text-gray-500">Cargando jugador...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editar jugador</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-6 space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('nombre')} className="input" />
            {errors.nombre && <p className="error">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="label">Apellido *</label>
            <input {...register('apellido')} className="input" />
            {errors.apellido && <p className="error">{errors.apellido.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Alias / Apodo</label>
          <input {...register('alias')} className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Cédula</label>
            <input {...register('cedula')} className="input" />
          </div>
          <div>
            <label className="label">Celular</label>
            <input {...register('celular')} className="input" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ciudad</label>
            <input {...register('ciudad')} className="input" />
          </div>
          <div>
            <label className="label">País</label>
            <input {...register('pais')} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Club o ciudad que representa *</label>
          <input {...register('club_ciudad')} className="input" />
          {errors.club_ciudad && <p className="error">{errors.club_ciudad.message}</p>}
        </div>

        {clubes.length > 0 && (
          <div>
            <label className="label">Vincular a club registrado</label>
            <select {...register('club_id')} className="input">
              <option value="">— Sin vincular —</option>
              {clubes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Categoría / Handicap</label>
          <input {...register('categoria')} className="input" />
        </div>

        <div>
          <label className="label">URL de foto</label>
          <input {...register('foto_url')} className="input" />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('activo')} />
          Jugador activo
        </label>

        {errors.root && <p className="error text-center">{errors.root.message}</p>}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

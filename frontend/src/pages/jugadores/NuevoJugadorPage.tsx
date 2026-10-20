import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Club } from '../../types';

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
});
type Form = z.infer<typeof schema>;

export default function NuevoJugadorPage() {
  const navigate = useNavigate();
  const { data: clubes = [] } = useQuery<Club[]>({
    queryKey: ['clubes'],
    queryFn: () => api.get('/jugadores/clubes').then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { pais: 'Colombia' },
  });

  async function onSubmit(data: Form) {
    try {
      await api.post('/jugadores', data);
      navigate('/jugadores');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al crear el jugador';
      setError('root', { message: msg });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Registrar Jugador</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-6 space-y-5">

        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('nombre')} className="input" placeholder="Ej: Jorge" />
            {errors.nombre && <p className="error">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="label">Apellido *</label>
            <input {...register('apellido')} className="input" placeholder="Ej: Cumbal" />
            {errors.apellido && <p className="error">{errors.apellido.message}</p>}
          </div>
        </div>

        {/* Alias */}
        <div>
          <label className="label">Alias / Apodo</label>
          <input {...register('alias')} className="input" placeholder="Ej: El Maestro" />
          <p className="text-xs text-gray-400 mt-1">Nombre por el que se le conoce en el ambiente</p>
        </div>

        {/* Cédula y Celular */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cédula</label>
            <input {...register('cedula')} className="input" placeholder="Número de documento" />
          </div>
          <div>
            <label className="label">Celular</label>
            <input {...register('celular')} className="input" placeholder="Ej: 3001234567" />
          </div>
        </div>

        {/* Ciudad y País */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ciudad</label>
            <input {...register('ciudad')} className="input" placeholder="Ej: Pasto" />
          </div>
          <div>
            <label className="label">País</label>
            <input {...register('pais')} className="input" placeholder="Colombia" />
          </div>
        </div>

        {/* Club */}
        <div>
          <label className="label">Club o ciudad que representa *</label>
          <input {...register('club_ciudad')} className="input" placeholder="Ej: Team Guancha" />
          {errors.club_ciudad && <p className="error">{errors.club_ciudad.message}</p>}
        </div>

        {/* Vincular a club registrado */}
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

        {/* Categoría */}
        <div>
          <label className="label">Categoría / Handicap</label>
          <input {...register('categoria')} className="input" placeholder="Ej: A, B, C o libre" />
        </div>

        {/* Foto URL */}
        <div>
          <label className="label">URL de foto</label>
          <input {...register('foto_url')} className="input" placeholder="https://..." />
          <p className="text-xs text-gray-400 mt-1">Enlace a la foto del jugador (opcional)</p>
        </div>

        {errors.root && <p className="error text-center">{errors.root.message}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Guardando...' : 'Registrar jugador'}
          </button>
        </div>
      </form>
    </div>
  );
}

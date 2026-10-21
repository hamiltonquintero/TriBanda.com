import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Torneo } from '../../types';

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  descripcion: z.string().optional(),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha de fin requerida'),
  sede: z.string().min(2, 'Sede requerida'),
  incremento: z.coerce.number().min(0).max(10),
  meta_base: z.coerce.number().int().min(5).max(60).default(30),
  modalidad: z.enum(['profesional', 'local', 'relampago']).default('local'),
  distancia_relampago: z.enum(['corto', 'largo']).nullable().optional(),
  limite_entradas: z.coerce.number().int().min(5).max(100).nullable().optional(),
  modo_libre: z.boolean().default(false),
});
type Form = z.infer<typeof schema>;

function toInputDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function EditarTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: torneo, isLoading } = useQuery<Torneo>({
    queryKey: ['torneo', id],
    queryFn: () => api.get(`/torneos/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const modalidadActual = watch('modalidad');
  const esModoLibre = watch('modo_libre');
  const distanciaRelampago = watch('distancia_relampago');

  useEffect(() => {
    if (!torneo) return;
    reset({
      nombre: torneo.nombre,
      descripcion: torneo.descripcion ?? '',
      fecha_inicio: toInputDate(torneo.fecha_inicio),
      fecha_fin: toInputDate(torneo.fecha_fin),
      sede: torneo.sede,
      incremento: torneo.incremento,
      modalidad: torneo.modalidad ?? 'local',
      distancia_relampago: torneo.distancia_relampago ?? 'corto',
      meta_base: torneo.meta_base ?? 24,
      limite_entradas: torneo.limite_entradas ?? 25,
      modo_libre: !!torneo.modo_libre,
    });
  }, [torneo, reset]);

  async function onSubmit(data: Form) {
    try {
      const payload = {
        ...data,
        fecha_inicio: new Date(data.fecha_inicio).toISOString(),
        fecha_fin: new Date(data.fecha_fin).toISOString(),
      };
      await api.put(`/torneos/${id}`, payload);
      navigate(`/torneos/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar';
      setError('root', { message: msg });
    }
  }

  if (isLoading || !torneo) return <p className="text-gray-500">Cargando torneo...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editar torneo</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-6 space-y-5">

        {/* Selector de Modalidad */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50/40 p-4 rounded-xl border border-emerald-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 mb-2">
            Tipo y Formato de Torneo *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setValue('modalidad', 'local');
                setValue('meta_base', 24);
                setValue('limite_entradas', 25);
                setValue('modo_libre', false);
              }}
              className={`p-3 rounded-xl text-left border-2 transition ${
                modalidadActual === 'local'
                  ? 'border-emerald-600 bg-white shadow-md text-emerald-950'
                  : 'border-transparent bg-white/70 hover:bg-white text-gray-700'
              }`}
            >
              <div className="text-xl mb-1">🎱</div>
              <p className="font-bold text-sm leading-tight">Torneo Local / Club</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                A 1 solo set directo. Con límite o libre y hándicap individual.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setValue('modalidad', 'profesional');
                setValue('meta_base', 30);
                setValue('limite_entradas', 20);
                setValue('modo_libre', false);
              }}
              className={`p-3 rounded-xl text-left border-2 transition ${
                modalidadActual === 'profesional'
                  ? 'border-emerald-600 bg-white shadow-md text-emerald-950'
                  : 'border-transparent bg-white/70 hover:bg-white text-gray-700'
              }`}
            >
              <div className="text-xl mb-1">🏆</div>
              <p className="font-bold text-sm leading-tight">Oficial / Profesional</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Al mejor de 3 sets. Planilla completa entrada por entrada.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setValue('modalidad', 'relampago');
                setValue('distancia_relampago', 'corto');
                setValue('meta_base', 10);
                setValue('modo_libre', true);
              }}
              className={`p-3 rounded-xl text-left border-2 transition ${
                modalidadActual === 'relampago'
                  ? 'border-amber-500 bg-white shadow-md text-amber-950'
                  : 'border-transparent bg-white/70 hover:bg-white text-gray-700'
              }`}
            >
              <div className="text-xl mb-1">⚡</div>
              <p className="font-bold text-sm leading-tight">Torneo Relámpago</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Partidas ultra rápidas directas a carambolas.
              </p>
            </button>
          </div>

          {modalidadActual === 'relampago' && (
            <div className="mt-3.5 pt-3 border-t border-emerald-200/60">
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                Modalidad Relámpago:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setValue('distancia_relampago', 'corto');
                    setValue('meta_base', 10);
                  }}
                  className={`p-2 rounded-lg text-xs font-bold border transition ${
                    distanciaRelampago === 'corto'
                      ? 'bg-amber-100 border-amber-400 text-amber-950'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  🎯 Juego Corto (8 a 10 carambolas)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue('distancia_relampago', 'largo');
                    setValue('meta_base', 18);
                  }}
                  className={`p-2 rounded-lg text-xs font-bold border transition ${
                    distanciaRelampago === 'largo'
                      ? 'bg-amber-100 border-amber-400 text-amber-950'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  🚀 Juego Largo (15 a 18 carambolas)
                </button>
              </div>
            </div>
          )}

          {modalidadActual === 'local' && (
            <div className="mt-3.5 pt-3 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-gray-800 block mb-1">Límite de Entradas:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={60}
                    disabled={esModoLibre}
                    {...register('limite_entradas')}
                    className="input h-9 text-center font-bold w-24"
                  />
                  <label className="flex items-center gap-1 cursor-pointer font-medium text-gray-700">
                    <input type="checkbox" {...register('modo_libre')} className="rounded text-emerald-600" />
                    <span>Libre de entradas</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-800 block mb-1">Carambolas Base (Hándicap):</label>
                <input
                  type="number"
                  min={10}
                  max={50}
                  {...register('meta_base')}
                  className="input h-9 text-center font-bold w-28"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label">Nombre del torneo *</label>
          <input {...register('nombre')} className="input" />
          {errors.nombre && <p className="error">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="label">Descripción</label>
          <input {...register('descripcion')} className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de inicio *</label>
            <input {...register('fecha_inicio')} type="date" className="input" />
            {errors.fecha_inicio && <p className="error">{errors.fecha_inicio.message}</p>}
          </div>
          <div>
            <label className="label">Fecha de fin *</label>
            <input {...register('fecha_fin')} type="date" className="input" />
            {errors.fecha_fin && <p className="error">{errors.fecha_fin.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Sede *</label>
          <input {...register('sede')} className="input" />
          {errors.sede && <p className="error">{errors.sede.message}</p>}
        </div>

        <div>
          <label className="label">Incremento de puntos (%)</label>
          <input {...register('incremento')} type="number" step="0.01" min="0" max="10" className="input" placeholder="Ej: 0.30 para 30%" />
          <p className="text-xs text-gray-400 mt-1">Escribe el porcentaje como decimal (0.30 = 30%, 0.50 = 50%)</p>
        </div>

        {errors.root && <p className="error text-center">{errors.root.message}</p>}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

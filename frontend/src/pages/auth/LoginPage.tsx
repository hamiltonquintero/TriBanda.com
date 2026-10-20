import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.token, res.data.usuario);
      // Redirigir según rol
      const rol = res.data.usuario.rol;
      if (rol === 'juez') navigate('/juez');
      else if (rol === 'admin') navigate('/dashboard');
      else navigate('/publico');
    } catch {
      setError('root', { message: 'Email o contraseña incorrectos' });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-billar">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-heading font-extrabold text-billar-green tracking-tight">TRIBANDA</h1>
          <p className="text-sm text-accent-600 font-semibold mt-0.5">Gestiona · Juega · Compite</p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full font-medium shadow-2xs">
            <span>💻</span> Desarrollado por <strong className="font-bold text-emerald-800">Hamilton Quintero</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">
              <span className="material-icons text-sm mr-1 align-middle text-gray-400">email</span>
              Email
            </label>
            <input {...register('email')} type="email" className="input" placeholder="tu@email.com" />
            {errors.email && <p className="error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">
              <span className="material-icons text-sm mr-1 align-middle text-gray-400">lock</span>
              Contraseña
            </label>
            <input {...register('password')} type="password" className="input" placeholder="••••••••" />
            {errors.password && <p className="error">{errors.password.message}</p>}
          </div>
          {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-base py-3">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  nombreJugador?: string;
}

export default function FotoUpload({ value, onChange, nombreJugador }: Props) {
  const [modoUrl, setModoUrl] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Procesa la imagen seleccionada: redimensiona a cuadrado 360x360 y comprime
  function procesarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcesando(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Crear canvas cuadrado centrado (360x360)
          const size = 360;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            onChange(event.target?.result as string);
            setProcesando(false);
            return;
          }

          // Calcular recorte centrado (object-fit: cover)
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          // Convertir a JPEG con compresión equilibrada (calidad 0.84)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          onChange(dataUrl);
        } catch (err) {
          console.error('Error al optimizar imagen:', err);
          // Fallback a imagen sin recortar si canvas falla
          onChange(event.target?.result as string);
        } finally {
          setProcesando(false);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  }

  function eliminarFoto() {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <span className="material-icons text-primary-600 text-sm">photo_camera</span>
          Foto del Jugador (Opción 3: Carga directa a la Nube / Celular)
        </label>
        {value && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="material-icons text-[12px]">check_circle</span>
            Foto asignada
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Previsualización del Avatar */}
        <div className="relative group flex-shrink-0">
          {value ? (
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary-500 shadow-md bg-gray-900">
              <img
                src={value}
                alt={nombreJugador || 'Jugador'}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={eliminarFoto}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-xs font-medium"
                title="Eliminar foto"
              >
                <span className="material-icons text-base text-red-400">delete</span>
                Quitar
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 shadow-2xs">
              <span className="material-icons text-3xl text-gray-300">person</span>
              <span className="text-[10px] text-gray-400 font-medium mt-1">Sin foto</span>
            </div>
          )}

          {procesando && (
            <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
              <span className="animate-spin material-icons text-primary-600">sync</span>
            </div>
          )}
        </div>

        {/* Acciones de carga */}
        <div className="flex-1 space-y-2 text-center sm:text-left w-full">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={procesarArchivo}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={procesando}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-icons text-sm">upload</span>
              {value ? 'Cambiar foto' : 'Subir foto o Tomar con cámara'}
            </button>

            <button
              type="button"
              onClick={() => setModoUrl(!modoUrl)}
              className="btn-outline text-xs text-gray-700 border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
            >
              <span className="material-icons text-xs">link</span>
              {modoUrl ? 'Ocultar URL' : 'Pegar enlace web'}
            </button>

            {value && (
              <button
                type="button"
                onClick={eliminarFoto}
                className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 py-1"
              >
                Quitar
              </button>
            )}
          </div>

          {/* Campo alternativo para ingresar URL directa si se desea */}
          {modoUrl && (
            <div className="pt-1 animate-in fade-in duration-150">
              <input
                type="text"
                value={value?.startsWith('data:') ? '' : (value || '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://ejemplo.com/foto-jugador.jpg"
                className="input text-xs w-full"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Puedes pegar un enlace directo de Cloudinary, Drive o cualquier servidor de imágenes.
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed">
            💡 Las fotos se centran y optimizan automáticamente. Se mostrarán con nitidez en el <strong>marcador digital</strong>, en las <strong>pantallas Smart TV</strong> del torneo y en la <strong>planilla del juez</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

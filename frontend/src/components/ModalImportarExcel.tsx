import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';

interface JugadorImportado {
  nombre: string;
  apellido?: string;
  alias?: string;
  cedula?: string;
  celular?: string;
  ciudad?: string;
  club_ciudad?: string;
  categoria?: string;
  promedio_historico?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalImportarExcel({ isOpen, onClose, onSuccess }: Props) {
  const [jugadoresPrevia, setJugadoresPrevia] = useState<JugadorImportado[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{
    total: number;
    creados: number;
    actualizados: number;
    errores: string[];
  } | null>(null);
  const [errorLectura, setErrorLectura] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Descargar plantilla oficial en formato .xlsx
  function descargarPlantilla() {
    const filasEjemplo = [
      {
        'Nombre': 'Pedro',
        'Apellido': 'González',
        'Alias / Apodo': 'El Mago',
        'Cédula / Documento': '1085234567',
        'Club / Ciudad': 'Club Billar Bogotá',
        'Celular': '3001234567',
        'Promedio Histórico': 0.850,
        'Categoría': 'Primera',
        'Ciudad': 'Bogotá',
      },
      {
        'Nombre': 'Carlos',
        'Apellido': 'Mendoza',
        'Alias / Apodo': 'El Zurdo',
        'Cédula / Documento': '98765432',
        'Club / Ciudad': 'Club Cali Master',
        'Celular': '3109876543',
        'Promedio Histórico': 0.620,
        'Categoría': 'Segunda',
        'Ciudad': 'Cali',
      },
      {
        'Nombre': 'Juan',
        'Apellido': 'Pérez',
        'Alias / Apodo': '',
        'Cédula / Documento': '1122334455',
        'Club / Ciudad': 'Team Nariño',
        'Celular': '3155555555',
        'Promedio Histórico': 0.450,
        'Categoría': 'Tercera',
        'Ciudad': 'Pasto',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(filasEjemplo);
    // Ancho de columnas
    ws['!cols'] = [
      { wch: 16 }, // Nombre
      { wch: 16 }, // Apellido
      { wch: 18 }, // Alias
      { wch: 20 }, // Cédula
      { wch: 24 }, // Club
      { wch: 16 }, // Celular
      { wch: 20 }, // Promedio
      { wch: 14 }, // Categoría
      { wch: 14 }, // Ciudad
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
    XLSX.writeFile(wb, 'Plantilla_Jugadores_TriBanda.xlsx');
  }

  // Normalizador de cabeceras para ser flexible con lo que suba el usuario
  function normalizarClave(clave: string): string {
    return clave
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // 2. Procesar el archivo seleccionado
  function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorLectura('');
    setResultado(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const primerNombreHoja = wb.SheetNames[0];
        const hoja = wb.Sheets[primerNombreHoja];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(hoja, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrorLectura('El archivo no contiene filas con datos.');
          setJugadoresPrevia([]);
          return;
        }

        // Mapear filas
        const procesados: JugadorImportado[] = [];

        for (const row of rawJson) {
          // Crear mapa normalizado de la fila
          const mapaFila: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            mapaFila[normalizarClave(k)] = String(v ?? '').trim();
          }

          // Detectar Nombre y Apellido
          let nombre =
            mapaFila['nombre'] ||
            mapaFila['nombres'] ||
            mapaFila['nombrecompleto'] ||
            mapaFila['jugador'] ||
            mapaFila['atleta'] ||
            mapaFila['player'] ||
            '';

          let apellido =
            mapaFila['apellido'] ||
            mapaFila['apellidos'] ||
            mapaFila['primerapellido'] ||
            '';

          // Si vino todo en "nombre" o "jugador" y no hay apellido, separar
          if (!apellido && nombre.includes(' ')) {
            const partes = nombre.split(/\s+/);
            nombre = partes[0];
            apellido = partes.slice(1).join(' ');
          }

          if (!nombre) continue; // Omitir filas sin nombre

          // Alias
          const alias =
            mapaFila['alias'] ||
            mapaFila['apodo'] ||
            mapaFila['sobrenombre'] ||
            mapaFila['nickname'] ||
            undefined;

          // Cédula / Documento
          const cedula =
            mapaFila['cedula'] ||
            mapaFila['documento'] ||
            mapaFila['doc'] ||
            mapaFila['identificacion'] ||
            mapaFila['cc'] ||
            mapaFila['dni'] ||
            undefined;

          // Club / Ciudad
          const club_ciudad =
            mapaFila['clubciudad'] ||
            mapaFila['club'] ||
            mapaFila['sede'] ||
            mapaFila['equipo'] ||
            'Club Principal';

          // Celular
          const celular =
            mapaFila['celular'] ||
            mapaFila['telefono'] ||
            mapaFila['whatsapp'] ||
            mapaFila['movil'] ||
            undefined;

          // Ciudad
          const ciudad = mapaFila['ciudad'] || mapaFila['municipio'] || undefined;

          // Promedio
          const rawProm =
            mapaFila['promediohistorico'] ||
            mapaFila['promedio'] ||
            mapaFila['avg'] ||
            mapaFila['handicap'] ||
            mapaFila['prom'] ||
            '0';
          const promedio_historico = parseFloat(rawProm.replace(',', '.')) || 0;

          // Categoría
          let categoria =
            mapaFila['categoria'] ||
            mapaFila['cat'] ||
            mapaFila['nivel'] ||
            undefined;

          if (!categoria && promedio_historico > 0) {
            if (promedio_historico >= 0.8) categoria = 'Primera';
            else if (promedio_historico >= 0.5) categoria = 'Segunda';
            else categoria = 'Tercera';
          }

          procesados.push({
            nombre,
            apellido,
            alias,
            cedula,
            celular,
            ciudad,
            club_ciudad,
            categoria,
            promedio_historico,
          });
        }

        if (procesados.length === 0) {
          setErrorLectura(
            'No se detectaron jugadores válidos. Verifica que las columnas tengan nombres como "Nombre", "Apellido", "Cédula", etc.'
          );
        }

        setJugadoresPrevia(procesados);
      } catch (err: unknown) {
        console.error(err);
        setErrorLectura('Error al leer el archivo Excel. Asegúrate de que sea un archivo .xlsx, .xls o .csv válido.');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // 3. Confirmar e importar al servidor
  async function confirmarImportacion() {
    if (jugadoresPrevia.length === 0) return;
    setCargando(true);
    setErrorLectura('');
    try {
      const resp = await api.post('/jugadores/masivo', {
        jugadores: jugadoresPrevia,
      });
      setResultado(resp.data);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error de comunicación con el servidor al importar los jugadores.';
      setErrorLectura(msg);
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setJugadoresPrevia([]);
    setNombreArchivo('');
    setResultado(null);
    setErrorLectura('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary-900 via-primary-800 to-primary-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-icons text-xl text-primary-200">upload_file</span>
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold">Importar Jugadores desde Excel / CSV</h2>
              <p className="text-xs text-primary-200">
                Carga masiva rápida con auto-detección de columnas y cálculo de categorías
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <span className="material-icons text-base">close</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Paso 1: Descargar plantilla */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="material-icons text-amber-600 mt-0.5 text-xl">help_outline</span>
              <div>
                <h4 className="text-sm font-bold text-amber-900">¿No tienes el formato listo?</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Descarga nuestra plantilla oficial prediseñada en Excel con columnas y ejemplos listos para rellenar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="btn-outline bg-white hover:bg-amber-100/50 text-amber-900 border-amber-300 text-xs flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto font-semibold shadow-2xs"
            >
              <span className="material-icons text-sm text-green-700">file_download</span>
              Descargar Plantilla (.xlsx)
            </button>
          </div>

          {/* Resultado de importación completada */}
          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-green-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-base text-green-800">
                <span className="material-icons text-green-600">check_circle</span>
                ¡Importación masiva completada con éxito!
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="bg-white/80 p-3 rounded-lg border border-green-200">
                  <div className="text-2xl font-black text-green-700">{resultado.total}</div>
                  <div className="text-xs text-gray-600 font-medium">Filas procesadas</div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-green-200">
                  <div className="text-2xl font-black text-emerald-700">+{resultado.creados}</div>
                  <div className="text-xs text-gray-600 font-medium">Nuevos creados</div>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-green-200">
                  <div className="text-2xl font-black text-blue-700">{resultado.actualizados}</div>
                  <div className="text-xs text-gray-600 font-medium">Existentes actualizados</div>
                </div>
              </div>

              {resultado.errores && resultado.errores.length > 0 && (
                <div className="mt-3 bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-800">
                  <p className="font-bold mb-1">Avisos durante la importación:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {resultado.errores.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={reiniciar}
                  className="btn-outline text-xs border-green-300 text-green-800"
                >
                  Importar otro archivo
                </button>
                <button type="button" onClick={onClose} className="btn-primary text-xs">
                  Cerrar y ver directorio
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Zona de carga de archivo */}
          {!resultado && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Selecciona o arrastra el archivo Excel (.xlsx, .xls) o CSV:
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition bg-gray-50/50 hover:bg-primary-50/20 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={manejarArchivo}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <span className="material-icons text-2xl">cloud_upload</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {nombreArchivo ? (
                    <span className="text-primary-700 font-bold">📄 {nombreArchivo}</span>
                  ) : (
                    'Haz clic para seleccionar el archivo o arrástralo aquí'
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Formatos compatibles: Microsoft Excel (.xlsx, .xls) y CSV (.csv)
                </p>
              </div>

              {errorLectura && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <span className="material-icons text-sm text-red-600">error_outline</span>
                  {errorLectura}
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Vista previa de jugadores detectados */}
          {!resultado && jugadoresPrevia.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="material-icons text-sm text-primary-600">visibility</span>
                  Vista previa de jugadores detectados ({jugadoresPrevia.length})
                </h3>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="text-xs text-gray-500 hover:text-red-600 underline"
                >
                  Limpiar lista
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                <table className="table-billar text-xs">
                  <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr>
                      <th className="w-8 text-center">#</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>Alias</th>
                      <th>Cédula</th>
                      <th>Club / Sede</th>
                      <th className="text-center">Promedio</th>
                      <th className="text-center">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadoresPrevia.map((j, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="font-semibold text-gray-900">{j.nombre}</td>
                        <td className="text-gray-700">{j.apellido || '-'}</td>
                        <td className="text-gray-500 italic">{j.alias ? `"${j.alias}"` : '-'}</td>
                        <td className="font-mono text-gray-600">{j.cedula || '-'}</td>
                        <td className="text-gray-700">{j.club_ciudad}</td>
                        <td className="text-center font-mono font-bold text-primary-700">
                          {j.promedio_historico ? j.promedio_historico.toFixed(3) : '0.000'}
                        </td>
                        <td className="text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              j.categoria === 'Primera'
                                ? 'bg-green-100 text-green-800'
                                : j.categoria === 'Segunda'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {j.categoria || 'Sin cat.'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal con marca de Hamilton Quintero */}
        <div className="px-6 py-3.5 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <span className="material-icons text-xs text-primary-600">code</span>
            Sistema desarrollado por <strong className="text-gray-800">Hamilton Quintero</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="btn-secondary text-xs flex-1 sm:flex-initial"
            >
              Cancelar
            </button>

            {!resultado && (
              <button
                type="button"
                onClick={confirmarImportacion}
                disabled={cargando || jugadoresPrevia.length === 0}
                className="btn-primary text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-sm"
              >
                {cargando ? (
                  <>
                    <span className="animate-spin material-icons text-xs">sync</span>
                    Importando {jugadoresPrevia.length} jugadores...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm">save</span>
                    Confirmar e Importar {jugadoresPrevia.length > 0 ? `(${jugadoresPrevia.length})` : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

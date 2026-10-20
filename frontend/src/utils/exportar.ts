// ─── EXPORTAR A CSV (se abre en Excel) ───────────────────────────────────────

export function exportarCSV(datos: Record<string, unknown>[], nombreArchivo: string) {
  if (datos.length === 0) return;

  const columnas = Object.keys(datos[0]);
  const bom = '\uFEFF'; // BOM para que Excel reconozca UTF-8
  const header = columnas.join(';');
  const filas = datos.map((fila) =>
    columnas.map((col) => {
      const val = fila[col];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';')
  );

  const csv = bom + [header, ...filas].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombreArchivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── EXPORTAR A PDF (usando print del navegador) ─────────────────────────────

export function exportarPDF(titulo: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const contenido = document.querySelector('main')?.innerHTML ?? '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1, h2, h3 { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #1B5E20; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .header-print { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1B5E20; padding-bottom: 10px; }
        .header-print h1 { color: #1B5E20; font-size: 24px; }
        .header-print p { color: #666; font-size: 14px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header-print">
        <h1>TRIBANDA</h1>
        <p>${titulo}</p>
        <p style="font-size:11px; color:#999;">Generado: ${new Date().toLocaleString('es-CO')}</p>
      </div>
      ${contenido}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

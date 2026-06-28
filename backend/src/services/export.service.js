const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

/**
 * Genera un archivo Excel (.xlsx) a partir de un array de objetos.
 * @param {Array}  data       - Arreglo de objetos con los datos
 * @param {string} sheetName  - Nombre de la hoja
 * @returns {Buffer} - Buffer del archivo Excel
 */
const generarExcel = (data, sheetName = 'Reporte') => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar ancho de columnas automáticamente
  const cols = Object.keys(data[0] || {}).map((k) => ({
    wch: Math.max(k.length + 2, 15),
  }));
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Genera un reporte PDF de activos.
 * @param {Array}  activos   - Lista de activos
 * @param {string} titulo    - Título del reporte
 * @returns {Promise<Buffer>}
 */
const generarPDFActivos = (activos, titulo = 'Reporte de Activos') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ─── Encabezado ───────────────────────────────────────────────
    doc.fontSize(20).fillColor('#1e40af').text('LabTrack', { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text(titulo, { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280')
       .text(`Generado: ${new Date().toLocaleString('es-MX')}`, { align: 'center' });
    doc.moveDown();

    // ─── Línea divisoria ───────────────────────────────────────────
    doc.strokeColor('#e5e7eb').lineWidth(1)
       .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // ─── Resumen ───────────────────────────────────────────────────
    doc.fontSize(11).fillColor('#111827')
       .text(`Total de activos: ${activos.length}`, { continued: true })
       .text(`   Disponibles: ${activos.filter(a => a.estado === 'disponible').length}`, { continued: true })
       .text(`   Prestados: ${activos.filter(a => a.estado === 'prestado').length}`);
    doc.moveDown();

    // ─── Tabla de activos ─────────────────────────────────────────
    const colWidths = [80, 160, 80, 90, 100];
    const headers   = ['Código', 'Nombre', 'Categoría', 'Estado', 'Ubicación'];
    const startX    = 40;
    let   y         = doc.y;

    // Header de tabla
    doc.fontSize(9).fillColor('#ffffff');
    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.rect(x, y, colWidths[i], 18).fill('#1e40af');
      doc.fillColor('#ffffff').text(h, x + 4, y + 5, { width: colWidths[i] - 8 });
    });
    y += 18;

    // Filas de datos
    activos.forEach((activo, idx) => {
      if (y > 750) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
      const rowData = [
        activo.codigo,
        activo.nombre,
        activo.categoria,
        activo.estado,
        activo.ubicacion || 'N/A',
      ];
      doc.fontSize(8).fillColor('#374151');
      rowData.forEach((cell, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.rect(x, y, colWidths[i], 16).fill(bg).stroke('#e5e7eb');
        doc.fillColor('#374151').text(String(cell || ''), x + 4, y + 4, { width: colWidths[i] - 8 });
      });
      y += 16;
    });

    doc.end();
  });
};

module.exports = { generarExcel, generarPDFActivos };

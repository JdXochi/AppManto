// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Exportación de reportes a Excel (.xlsx)
// La librería ExcelJS se carga solo al presionar "Descargar".
// =========================================================
import { hoyLocalISO, diasRegistroTardio } from "./shared.js";

const EXCELJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";

const COLOR_ENCABEZADO = "FF1F3A5F";   // azul marino
const COLOR_BORDE = "FFD0D5DD";

// Color por estado de mantenimiento (relleno, texto)
const COLORES_ESTADO = {
  "Atrasado":     { fill: "FFFDE2E1", font: "FFB42318" },
  "Próximo":      { fill: "FFFEF0C7", font: "FF93370D" },
  "Vigente":      { fill: "FFD1FADF", font: "FF1E7B34" },
  "Sin registro": { fill: "FFEAECF0", font: "FF475467" },
};

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------

function cargarExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = EXCELJS_URL;
    s.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error("No se pudo iniciar la librería de Excel."));
    s.onerror = () => reject(new Error("No se pudo cargar la librería de Excel. Revisa tu conexión a internet."));
    document.head.appendChild(s);
  });
}

// "2026-10-12" -> fecha real de Excel (medianoche UTC, para que no se corra de día)
function fechaExcel(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

// Instante (timestamptz) -> fecha y hora de Excel, tal como se ve en Guatemala
function fechaHoraExcelGT(iso) {
  if (!iso) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const g = t => Number(partes.find(p => p.type === t).value);
  return new Date(Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")));
}

function descargar(buffer, nombreArchivo) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Crea una hoja con encabezado con color, fila fija y filtros automáticos.
// columnas: [{ header, key, width, tipo?: "fecha" | "texto-largo" }]
function crearHojaDatos(wb, nombreHoja, columnas, filas, { filtro = true } = {}) {
  const ws = wb.addWorksheet(nombreHoja, { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = columnas.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width || 18,
    style: c.tipo === "fecha" ? { numFmt: "dd/mm/yyyy" }
         : c.tipo === "fechahora" ? { numFmt: "dd/mm/yyyy hh:mm" }
         : c.tipo === "costo" ? { numFmt: '"Q"#,##0.00' }
         : c.tipo === "porcentaje" ? { numFmt: "0.0%" }
         : {},
  }));

  const encabezado = ws.getRow(1);
  encabezado.height = 24;
  encabezado.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ENCABEZADO } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: COLOR_BORDE } } };
  });

  filas.forEach(f => ws.addRow(f));

  // Estilo del cuerpo
  const largos = new Set(columnas.filter(c => c.tipo === "texto-largo").map(c => c.key));
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const col = columnas[colNumber - 1];
      cell.alignment = { vertical: "top", wrapText: !!(col && largos.has(col.key)) };
      cell.border = { bottom: { style: "hair", color: { argb: COLOR_BORDE } } };
    });
  });

  if (filtro) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  return ws;
}

// Hoja "Información": qué reporte es, cuándo se generó, con qué filtros.
function crearHojaInfo(wb, titulo, { usuario, filtrosTexto, total, extra = [] }) {
  const ws = wb.addWorksheet("Información");
  ws.columns = [{ width: 28 }, { width: 70 }];

  const filas = [
    ["Reporte", titulo],
    ["Generado el", new Date().toLocaleString("es-GT")],
    ["Generado por", usuario || "—"],
    ["Filtros aplicados", filtrosTexto || "Ninguno (todos los registros)"],
    ["Total de registros", total],
    ...extra,
  ];
  filas.forEach(([a, b]) => {
    const row = ws.addRow([a, b]);
    row.getCell(1).font = { bold: true, color: { argb: COLOR_ENCABEZADO } };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.getCell(1).alignment = { vertical: "top" };
  });
  return ws;
}

// ---------------------------------------------------------------
// Reporte: Inventario de equipos
// filas: registros de la vista reporte_inventario (ya filtrados)
// ---------------------------------------------------------------
export async function exportarInventario(filas, { usuario, filtrosTexto } = {}) {
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xochi · Control de Mantenimiento";
  wb.created = new Date();

  const columnas = [
    { header: "Garita", key: "garita", width: 18 },
    { header: "Ubicación", key: "ubicacion", width: 26 },
    { header: "Tipo de equipo", key: "tipo", width: 20 },
    { header: "Serie / Código", key: "serie", width: 22 },
    { header: "Marca", key: "marca", width: 16 },
    { header: "Modelo", key: "modelo", width: 20 },
    { header: "IP", key: "ip", width: 16 },
    { header: "Encargado", key: "encargado", width: 26 },
    { header: "Puesto", key: "puesto", width: 24 },
    { header: "Frecuencia (meses)", key: "frecuencia", width: 12 },
    { header: "Último mantenimiento", key: "ultima", width: 16, tipo: "fecha" },
    { header: "Próxima fecha", key: "proxima", width: 16, tipo: "fecha" },
    { header: "Estado", key: "estado", width: 14 },
  ];

  const datos = filas.map(f => ({
    garita: f.garita || "",
    ubicacion: f.ubicacion || "",
    tipo: f.tipo || "",
    serie: f.serie || "",
    marca: f.marca || "",
    modelo: f.modelo || "",
    ip: f.ip || "",
    encargado: f.encargado_nombre || "",
    puesto: f.encargado_puesto || "",
    frecuencia: f.frecuencia_meses ?? null,
    ultima: fechaExcel(f.ultima_fecha),
    proxima: fechaExcel(f.proxima_fecha),
    estado: f.estado || "",
  }));

  const ws = crearHojaDatos(wb, "Inventario", columnas, datos);

  // Color en la columna Estado
  const colEstado = columnas.findIndex(c => c.key === "estado") + 1;
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const cell = row.getCell(colEstado);
    const c = COLORES_ESTADO[cell.value];
    if (c) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.fill } };
      cell.font = { bold: true, color: { argb: c.font } };
      cell.alignment = { vertical: "top", horizontal: "center" };
    }
  });

  crearHojaInfo(wb, "Inventario de equipos", {
    usuario, filtrosTexto, total: datos.length,
    extra: [
      ["Significado de Estado", "Vigente: mantenimiento al día.\nPróximo: vence en los próximos 15 días.\nAtrasado: la fecha ya pasó.\nSin registro: aún no tiene ningún mantenimiento."],
    ],
  });

  descargar(await wb.xlsx.writeBuffer(), `Inventario_${hoyLocalISO()}.xlsx`);
}

// ---------------------------------------------------------------
// Reporte: Mantenimientos realizados
// registros: resultado de listMantenimientos() (ya filtrados)
// ---------------------------------------------------------------
export async function exportarMantenimientos(registros, { usuario, filtrosTexto } = {}) {
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xochi · Control de Mantenimiento";
  wb.created = new Date();

  const columnas = [
    { header: "Fecha", key: "fecha", width: 13, tipo: "fecha" },
    { header: "Registrado el", key: "registrado", width: 18, tipo: "fechahora" },
    { header: "Días entre fecha y registro", key: "diasReg", width: 14 },
    { header: "Serie / Código", key: "serie", width: 22 },
    { header: "Tipo de equipo", key: "tipo", width: 20 },
    { header: "Garita", key: "garita", width: 18 },
    { header: "Ubicación", key: "ubicacion", width: 26 },
    { header: "Técnico", key: "tecnico", width: 24 },
    { header: "Actividades realizadas", key: "actividades", width: 48, tipo: "texto-largo" },
    { header: "Hallazgos / Observaciones", key: "hallazgos", width: 40, tipo: "texto-largo" },
    { header: "Confirmó", key: "confirmo", width: 24 },
    { header: "Puesto de quien confirmó", key: "puesto", width: 24 },
    { header: "Tipo de firma", key: "firma", width: 14 },
  ];

  const datos = registros.map(r => {
    const eq = r.equipos || {};
    const vobo = (r.vistos_buenos && r.vistos_buenos[0]) || {};
    return {
      fecha: fechaExcel(r.fecha),
      registrado: fechaHoraExcelGT(r.created_at),
      diasReg: r.created_at ? diasRegistroTardio(r.fecha, r.created_at) : null,
      serie: eq.serie || "",
      tipo: eq.tipo || "",
      garita: eq.garita || "",
      ubicacion: eq.ubicacion || "",
      tecnico: r.tecnico_nombre || "",
      actividades: r.actividades || "",
      hallazgos: r.hallazgos || "",
      confirmo: vobo.nombre || "",
      puesto: vobo.puesto || "",
      firma: vobo.tipo_firma || "",
    };
  });

  crearHojaDatos(wb, "Mantenimientos", columnas, datos);
  crearHojaInfo(wb, "Mantenimientos realizados", { usuario, filtrosTexto, total: datos.length });

  descargar(await wb.xlsx.writeBuffer(), `Mantenimientos_${hoyLocalISO()}.xlsx`);
}

// ---------------------------------------------------------------
// Utilidades para los reportes de seguimiento
// ---------------------------------------------------------------

// Diferencia en días entre dos fechas "YYYY-MM-DD" (a - b)
function diasEntre(a, b) {
  const t = iso => Date.parse(String(iso).slice(0, 10) + "T00:00:00Z");
  return Math.round((t(a) - t(b)) / 86400000);
}

// Fila de totales al final de una hoja de resumen
function agregarFilaTotal(ws, valores) {
  const row = ws.addRow(valores);
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = { bold: true };
    cell.border = { top: { style: "thin", color: { argb: COLOR_ENCABEZADO } } };
  });
  return row;
}

// ---------------------------------------------------------------
// Reporte: Pendientes y atrasados
// filas: registros de reporte_inventario con estado distinto de Vigente
// ---------------------------------------------------------------
export async function exportarPendientes(filas, { usuario, filtrosTexto } = {}) {
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xochi · Control de Mantenimiento";
  wb.created = new Date();

  const hoy = hoyLocalISO();
  const orden = { "Atrasado": 0, "Próximo": 1, "Sin registro": 2 };

  const datos = filas.map(f => {
    const dif = f.proxima_fecha ? diasEntre(hoy, f.proxima_fecha) : null;   // >0: ya pasó
    return {
      estado: f.estado || "",
      garita: f.garita || "",
      ubicacion: f.ubicacion || "",
      tipo: f.tipo || "",
      serie: f.serie || "",
      encargado: f.encargado_nombre || "",
      puesto: f.encargado_puesto || "",
      ultima: fechaExcel(f.ultima_fecha),
      proxima: fechaExcel(f.proxima_fecha),
      atraso: f.estado === "Atrasado" && dif !== null ? dif : null,
      restan: f.estado === "Próximo" && dif !== null ? -dif : null,
    };
  }).sort((a, b) =>
    (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) ||
    (b.atraso ?? 0) - (a.atraso ?? 0) ||
    (a.restan ?? 0) - (b.restan ?? 0) ||
    a.garita.localeCompare(b.garita, "es"));

  const columnas = [
    { header: "Estado", key: "estado", width: 14 },
    { header: "Garita", key: "garita", width: 18 },
    { header: "Ubicación", key: "ubicacion", width: 26 },
    { header: "Tipo de equipo", key: "tipo", width: 20 },
    { header: "Serie / Código", key: "serie", width: 22 },
    { header: "Encargado", key: "encargado", width: 26 },
    { header: "Puesto", key: "puesto", width: 24 },
    { header: "Último mantenimiento", key: "ultima", width: 16, tipo: "fecha" },
    { header: "Próxima fecha", key: "proxima", width: 16, tipo: "fecha" },
    { header: "Días de atraso", key: "atraso", width: 12 },
    { header: "Días para vencer", key: "restan", width: 12 },
  ];

  const ws = crearHojaDatos(wb, "Pendientes", columnas, datos);
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const cell = row.getCell(1);
    const c = COLORES_ESTADO[cell.value];
    if (c) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.fill } };
      cell.font = { bold: true, color: { argb: c.font } };
      cell.alignment = { vertical: "top", horizontal: "center" };
    }
  });

  crearHojaInfo(wb, "Pendientes y atrasados", {
    usuario, filtrosTexto, total: datos.length,
    extra: [
      ["Orden", "Primero los atrasados (más días de atraso arriba), luego los próximos a vencer y al final los que nunca han tenido mantenimiento."],
      ["Significado de Estado", "Atrasado: la fecha ya pasó.\nPróximo: vence en los próximos 15 días.\nSin registro: aún no tiene ningún mantenimiento."],
    ],
  });

  descargar(await wb.xlsx.writeBuffer(), `Pendientes_${hoy}.xlsx`);
}

// ---------------------------------------------------------------
// Reporte: Cambios de hardware (con resúmenes de costo)
// registros: resultado de listCambiosHardware() (ya filtrados)
// ---------------------------------------------------------------
export async function exportarHardware(registros, { usuario, filtrosTexto } = {}) {
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xochi · Control de Mantenimiento";
  wb.created = new Date();

  const datos = registros.map(r => {
    const eq = r.equipo || {};
    return {
      fecha: fechaExcel(r.fecha),
      serie: eq.serie || "",
      tipo: eq.tipo || "",
      garita: eq.garita || "",
      ubicacion: eq.ubicacion || "",
      accion: r.accion || "",
      categoria: r.categoria || "",
      detalle: r.descripcion || "",
      costo: r.costo === null || r.costo === undefined ? null : Number(r.costo),
      tecnico: r.tecnico_nombre || "",
    };
  });

  crearHojaDatos(wb, "Cambios", [
    { header: "Fecha", key: "fecha", width: 13, tipo: "fecha" },
    { header: "Serie / Código", key: "serie", width: 22 },
    { header: "Tipo de equipo", key: "tipo", width: 20 },
    { header: "Garita", key: "garita", width: 18 },
    { header: "Ubicación", key: "ubicacion", width: 26 },
    { header: "Qué se hizo", key: "accion", width: 16 },
    { header: "Pieza / categoría", key: "categoria", width: 26 },
    { header: "Detalle", key: "detalle", width: 48, tipo: "texto-largo" },
    { header: "Costo", key: "costo", width: 14, tipo: "costo" },
    { header: "Técnico", key: "tecnico", width: 24 },
  ], datos);

  // Resumen: cantidad y costo total por una clave (categoría, garita...)
  function resumen(nombreHoja, etiqueta, clave) {
    const grupos = new Map();
    datos.forEach(d => {
      const k = d[clave] || "(sin dato)";
      const g = grupos.get(k) || { n: 0, costo: 0 };
      g.n += 1;
      g.costo += d.costo || 0;
      grupos.set(k, g);
    });
    const filas = [...grupos.entries()]
      .sort((a, b) => b[1].costo - a[1].costo || b[1].n - a[1].n)
      .map(([k, g]) => ({ clave: k, cantidad: g.n, costo: g.costo }));

    const ws = crearHojaDatos(wb, nombreHoja, [
      { header: etiqueta, key: "clave", width: 30 },
      { header: "Cantidad de registros", key: "cantidad", width: 20 },
      { header: "Costo total", key: "costo", width: 16, tipo: "costo" },
    ], filas, { filtro: false });

    const total = agregarFilaTotal(ws, [
      "TOTAL",
      filas.reduce((a, f) => a + f.cantidad, 0),
      filas.reduce((a, f) => a + f.costo, 0),
    ]);
    total.getCell(3).numFmt = '"Q"#,##0.00';
  }
  resumen("Resumen por pieza", "Pieza / categoría", "categoria");
  resumen("Resumen por garita", "Garita", "garita");

  crearHojaInfo(wb, "Cambios de hardware", {
    usuario, filtrosTexto, total: datos.length,
    extra: [["Costos", "Los registros sin costo cuentan en la cantidad pero no suman al costo total."]],
  });

  descargar(await wb.xlsx.writeBuffer(), `Cambios_hardware_${hoyLocalISO()}.xlsx`);
}

// ---------------------------------------------------------------
// Reporte: Cumplimiento por garita y por tipo
// filas: registros de reporte_inventario
// Cumplimiento = (Vigente + Próximo) / total de equipos
// ---------------------------------------------------------------
export async function exportarCumplimiento(filas, { usuario } = {}) {
  const ExcelJS = await cargarExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xochi · Control de Mantenimiento";
  wb.created = new Date();

  function agrupar(nombreHoja, etiqueta, clave) {
    const grupos = new Map();
    filas.forEach(f => {
      const k = f[clave] || "(sin dato)";
      const g = grupos.get(k) || { total: 0, Vigente: 0, "Próximo": 0, Atrasado: 0, "Sin registro": 0 };
      g.total += 1;
      if (g[f.estado] !== undefined) g[f.estado] += 1;
      grupos.set(k, g);
    });

    const pct = g => g.total ? (g.Vigente + g["Próximo"]) / g.total : 0;
    const datos = [...grupos.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([k, g]) => ({
        clave: k, total: g.total, vigente: g.Vigente, proximo: g["Próximo"],
        atrasado: g.Atrasado, sin: g["Sin registro"], pct: pct(g),
      }));

    const ws = crearHojaDatos(wb, nombreHoja, [
      { header: etiqueta, key: "clave", width: 26 },
      { header: "Total de equipos", key: "total", width: 16 },
      { header: "Vigentes", key: "vigente", width: 12 },
      { header: "Próximos (≤15 días)", key: "proximo", width: 18 },
      { header: "Atrasados", key: "atrasado", width: 12 },
      { header: "Sin registro", key: "sin", width: 14 },
      { header: "% Cumplimiento", key: "pct", width: 16, tipo: "porcentaje" },
    ], datos, { filtro: false });

    const suma = k => datos.reduce((a, d) => a + d[k], 0);
    const total = suma("total");
    const fila = agregarFilaTotal(ws, [
      "TOTAL", total, suma("vigente"), suma("proximo"), suma("atrasado"), suma("sin"),
      total ? (suma("vigente") + suma("proximo")) / total : 0,
    ]);
    fila.getCell(7).numFmt = "0.0%";
  }

  agrupar("Por garita", "Garita", "garita");
  agrupar("Por tipo de equipo", "Tipo de equipo", "tipo");

  crearHojaInfo(wb, "Cumplimiento de mantenimiento", {
    usuario, filtrosTexto: "", total: filas.length,
    extra: [
      ["Cómo se calcula", "% Cumplimiento = (Vigentes + Próximos) ÷ Total de equipos.\nLos equipos Atrasados y los Sin registro cuentan como no cumplidos."],
      ["Significado de Estado", "Vigente: mantenimiento al día.\nPróximo: vence en los próximos 15 días (se considera al día).\nAtrasado: la fecha ya pasó.\nSin registro: aún no tiene ningún mantenimiento."],
    ],
  });

  descargar(await wb.xlsx.writeBuffer(), `Cumplimiento_${hoyLocalISO()}.xlsx`);
}

// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Generación de PDF de constancia por mantenimiento
// =========================================================
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
import { hoyLocalISO } from "./shared.js";

const NAVY = [31, 56, 109];       // #1F386D aprox. (mismo tono que la app)
const NAVY_DARK = [15, 51, 87];
const MUTED = [102, 112, 124];
const INK = [20, 32, 46];
const LINE = [225, 233, 238];
const G1 = [11, 143, 71], G2 = [218, 23, 105], G3 = [42, 128, 193], G4 = [240, 110, 33];

export function fmtDate(d) {
  if (!d) return "";
  const dt = (d instanceof Date) ? d : new Date(d + "T00:00:00");
  if (isNaN(dt)) return "";
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
}

export function addMonths(dateStr, months) {
  const dt = new Date(dateStr + "T00:00:00");
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

// Carga el logo una sola vez por sesión y lo deja listo como dataURL para jsPDF.
let logoDataUrlPromise = null;
function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("xochi-logo.png")
      .then(res => res.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .catch(err => { console.error("No se pudo cargar el logo para el PDF:", err); return null; });
  }
  return logoDataUrlPromise;
}

// equipo: { garita, tipo, serie, frecuencia_meses }
// registro: { fecha, tecnico_nombre, actividades, hallazgos }
// vobo: { nombre, puesto, tipo_firma, firmaDataUrl }
export async function generarPDFConstancia(equipo, registro, vobo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;

  // ---------- Encabezado ----------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 84, "F");

  const logoDataUrl = await getLogoDataUrl();
  if (logoDataUrl) {
    // placa blanca detrás del logo, igual que en la app
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 20, 96, 34, 4, 4, "F");
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const h = 20, w = h * (props.width / props.height);
      doc.addImage(logoDataUrl, "PNG", margin + (96 - w) / 2, 20 + (34 - h) / 2, w, h);
    } catch (e) { /* si falla, seguimos sin logo */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("Constancia de Mantenimiento de Equipo", margin + 112, 40);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Xochi · Corredor de las Flores — Departamento de IT", margin + 112, 57);

  // franja de 4 colores (mismo detalle de marca que el login/dashboard)
  const stripeW = pageW / 4;
  doc.setFillColor(...G1); doc.rect(0, 84, stripeW, 5, "F");
  doc.setFillColor(...G2); doc.rect(stripeW, 84, stripeW, 5, "F");
  doc.setFillColor(...G3); doc.rect(stripeW * 2, 84, stripeW, 5, "F");
  doc.setFillColor(...G4); doc.rect(stripeW * 3, 84, stripeW, 5, "F");

  let y = 122;
  const colGap = 24;
  const colW = (pageW - margin * 2 - colGap) / 2;
  const rightX = margin + colW + colGap;

  function tituloSeccion(texto) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(texto.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(...LINE);
    doc.line(margin, y, pageW - margin, y);
    y += 22;
  }

  // Dibuja un campo (etiqueta arriba, valor abajo) SIN traslape, sin importar
  // qué tan larga sea la etiqueta. Devuelve el "y" final que ocupó.
  function campo(x, yStart, width, label, value, valueFontSize = 11.5) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.3);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yStart);
    doc.setFont("helvetica", "normal"); doc.setFontSize(valueFontSize);
    doc.setTextColor(...INK);
    const split = doc.splitTextToSize(String(value || "—"), width);
    doc.text(split, x, yStart + 15);
    return yStart + 15 + split.length * (valueFontSize + 3);
  }

  function filaDosColumnas(labelA, valorA, labelB, valorB) {
    const finA = campo(margin, y, colW, labelA, valorA);
    const finB = campo(rightX, y, colW, labelB, valorB);
    y = Math.max(finA, finB) + 16;
  }

  function filaCompleta(label, valor, fontSize) {
    y = campo(margin, y, pageW - margin * 2, label, valor, fontSize) + 16;
  }

  // ---------- Datos del equipo ----------
  tituloSeccion("Datos del equipo");
  filaDosColumnas("Serie / código", equipo.serie, "Garita", equipo.garita);
  filaDosColumnas("Tipo de equipo", equipo.tipo, "Frecuencia de mantenimiento", `Cada ${equipo.frecuencia_meses} meses`);

  // ---------- Mantenimiento realizado ----------
  y += 6;
  tituloSeccion("Mantenimiento realizado");
  filaDosColumnas("Fecha de ejecución", fmtDate(registro.fecha), "Próxima fecha programada", fmtDate(addMonths(registro.fecha, equipo.frecuencia_meses)));
  filaCompleta("Técnico que realizó el mantenimiento", registro.tecnico_nombre, 12.5);
  filaCompleta("Actividades realizadas", registro.actividades);
  filaCompleta("Hallazgos / observaciones", registro.hallazgos);

  // ---------- Conformidad ----------
  y += 6;
  tituloSeccion("Conformidad del trabajo realizado");

  if (vobo.tipo_firma === "Digital" && vobo.firmaDataUrl) {
    doc.addImage(vobo.firmaDataUrl, "PNG", margin, y, 200, 76);
    y += 84;
  } else {
    doc.setDrawColor(...INK);
    doc.line(margin, y + 46, margin + 200, y + 46);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Firma física (pendiente de firmar en papel)", margin, y + 60);
    y += 72;
  }

  filaDosColumnas("Nombre de quien confirma", vobo.nombre, "Puesto", vobo.puesto);

  // ---------- Pie de página ----------
  const stripeY = pageH - 14;
  doc.setFillColor(...G1); doc.rect(0, stripeY, stripeW, 5, "F");
  doc.setFillColor(...G2); doc.rect(stripeW, stripeY, stripeW, 5, "F");
  doc.setFillColor(...G3); doc.rect(stripeW * 2, stripeY, stripeW, 5, "F");
  doc.setFillColor(...G4); doc.rect(stripeW * 3, stripeY, stripeW, 5, "F");

  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Generado el ${fmtDate(hoyLocalISO())}`, margin, pageH - 26);

  doc.save(`Mantenimiento_${equipo.serie}_${registro.fecha}.pdf`);
}

// =========================================================
// Constancia con VARIOS equipos en una sola hoja (una sola firma)
// items: [{ equipo: { serie, tipo, garita, ubicacion, frecuencia_meses },
//           registro: { fecha, actividades, hallazgos } }, ...]
// vobo:  { nombre, puesto, tipo_firma, firmaDataUrl }
// =========================================================
export async function generarPDFConstanciaMultiple(items, tecnicoNombre, vobo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const stripeW = pageW / 4;

  // ---------- Encabezado (solo primera página) ----------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 84, "F");

  const logoDataUrl = await getLogoDataUrl();
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 20, 96, 34, 4, 4, "F");
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const h = 20, w = h * (props.width / props.height);
      doc.addImage(logoDataUrl, "PNG", margin + (96 - w) / 2, 20 + (34 - h) / 2, w, h);
    } catch (e) { /* si falla, seguimos sin logo */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("Constancia de Mantenimiento de Equipos", margin + 112, 40);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Xochi · Corredor de las Flores — Departamento de IT", margin + 112, 57);

  doc.setFillColor(...G1); doc.rect(0, 84, stripeW, 5, "F");
  doc.setFillColor(...G2); doc.rect(stripeW, 84, stripeW, 5, "F");
  doc.setFillColor(...G3); doc.rect(stripeW * 2, 84, stripeW, 5, "F");
  doc.setFillColor(...G4); doc.rect(stripeW * 3, 84, stripeW, 5, "F");

  let y = 122;
  const colGap = 24;
  const colW = (pageW - margin * 2 - colGap) / 2;
  const rightX = margin + colW + colGap;

  function tituloSeccion(texto) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(texto.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(...LINE);
    doc.line(margin, y, pageW - margin, y);
    y += 22;
  }

  function campo(x, yStart, width, label, value, valueFontSize = 11.5) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.3);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yStart);
    doc.setFont("helvetica", "normal"); doc.setFontSize(valueFontSize);
    doc.setTextColor(...INK);
    const split = doc.splitTextToSize(String(value || "—"), width);
    doc.text(split, x, yStart + 15);
    return yStart + 15 + split.length * (valueFontSize + 3);
  }

  function filaDosColumnas(labelA, valorA, labelB, valorB) {
    const finA = campo(margin, y, colW, labelA, valorA);
    const finB = campo(rightX, y, colW, labelB, valorB);
    y = Math.max(finA, finB) + 16;
  }

  // ---------- Datos generales ----------
  tituloSeccion("Datos generales");
  filaDosColumnas("Técnico que realizó el mantenimiento", tecnicoNombre, "Total de equipos atendidos", String(items.length));

  // ---------- Tabla de equipos ----------
  y += 6;
  tituloSeccion("Equipos atendidos");

  const PAD = 5, LH = 10.5, FS = 8.5;
  const cols = [{ w: 22 }, { w: 128 }, { w: 50 }, { w: 50 }, { w: 137 }, { w: 137 }];
  const heads = ["#", "EQUIPO", "FECHA", "PRÓXIMA", "ACTIVIDADES REALIZADAS", "HALLAZGOS / OBSERVACIONES"];
  const tableW = cols.reduce((a, c) => a + c.w, 0);

  function cabeceraTabla() {
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, tableW, 20, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    heads.forEach((h, i) => { doc.text(h, x + PAD, y + 13); x += cols[i].w; });
    y += 20;
  }
  cabeceraTabla();

  items.forEach((it, idx) => {
    const eq = it.equipo, r = it.registro;
    const wEq = cols[1].w - 2 * PAD;

    doc.setFont("helvetica", "bold"); doc.setFontSize(FS);
    const serieL = doc.splitTextToSize(String(eq.serie || "—"), wEq);
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS);
    const tipoL = doc.splitTextToSize(String(eq.tipo || ""), wEq);
    const ubic = [eq.garita, eq.ubicacion].filter(Boolean).join(" · ");
    const ubicL = ubic ? doc.splitTextToSize(ubic, wEq) : [];
    const actL = doc.splitTextToSize(String(r.actividades || "—"), cols[4].w - 2 * PAD);
    const hallL = doc.splitTextToSize(String(r.hallazgos || "—"), cols[5].w - 2 * PAD);

    const nLineas = Math.max(serieL.length + tipoL.length + ubicL.length, actL.length, hallL.length, 1);
    const rowH = nLineas * LH + 2 * PAD;

    // salto de página: se repite la cabecera de la tabla
    if (y + rowH > pageH - 50) {
      doc.addPage();
      y = 50;
      cabeceraTabla();
    }

    if (idx % 2 === 0) {
      doc.setFillColor(247, 249, 251);
      doc.rect(margin, y, tableW, rowH, "F");
    }
    doc.setDrawColor(...LINE);
    doc.line(margin, y + rowH, margin + tableW, y + rowH);

    const base = y + PAD + FS;
    let x = margin;

    doc.setFont("helvetica", "normal"); doc.setFontSize(FS); doc.setTextColor(...INK);
    doc.text(String(idx + 1), x + PAD, base);
    x += cols[0].w;

    // Equipo: serie en negrita, tipo y ubicación debajo
    let ly = base;
    doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
    serieL.forEach(l => { doc.text(l, x + PAD, ly); ly += LH; });
    doc.setFont("helvetica", "normal");
    tipoL.forEach(l => { doc.text(l, x + PAD, ly); ly += LH; });
    doc.setTextColor(...MUTED);
    ubicL.forEach(l => { doc.text(l, x + PAD, ly); ly += LH; });
    x += cols[1].w;

    doc.setTextColor(...INK);
    doc.text(fmtDate(r.fecha), x + PAD, base);
    x += cols[2].w;

    const prox = eq.frecuencia_meses ? fmtDate(addMonths(r.fecha, eq.frecuencia_meses)) : "—";
    doc.text(prox, x + PAD, base);
    x += cols[3].w;

    actL.forEach((l, i) => doc.text(l, x + PAD, base + i * LH));
    x += cols[4].w;
    hallL.forEach((l, i) => doc.text(l, x + PAD, base + i * LH));

    y += rowH;
  });

  y += 24;

  // ---------- Conformidad (una sola firma para toda la hoja) ----------
  if (y + 190 > pageH - 50) { doc.addPage(); y = 50; }
  tituloSeccion("Conformidad del trabajo realizado");

  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  const nota = doc.splitTextToSize(
    "Quien firma confirma que los trabajos descritos se realizaron correctamente en los equipos listados.",
    pageW - margin * 2);
  doc.text(nota, margin, y - 6);
  y += nota.length * 11;

  if (vobo.tipo_firma === "Digital" && vobo.firmaDataUrl) {
    doc.addImage(vobo.firmaDataUrl, "PNG", margin, y, 200, 76);
    y += 84;
  } else {
    doc.setDrawColor(...INK);
    doc.line(margin, y + 46, margin + 200, y + 46);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Firma física (pendiente de firmar en papel)", margin, y + 60);
    y += 72;
  }

  filaDosColumnas("Nombre de quien confirma", vobo.nombre, "Puesto", vobo.puesto);

  // ---------- Pie de página en TODAS las páginas ----------
  const total = doc.getNumberOfPages();
  const generado = `Generado el ${fmtDate(hoyLocalISO())}`;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const stripeY = pageH - 14;
    doc.setFillColor(...G1); doc.rect(0, stripeY, stripeW, 5, "F");
    doc.setFillColor(...G2); doc.rect(stripeW, stripeY, stripeW, 5, "F");
    doc.setFillColor(...G3); doc.rect(stripeW * 2, stripeY, stripeW, 5, "F");
    doc.setFillColor(...G4); doc.rect(stripeW * 3, stripeY, stripeW, 5, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(generado, margin, pageH - 26);
    doc.text(`Página ${p} de ${total}`, pageW - margin, pageH - 26, { align: "right" });
  }

  const fechaMax = items.map(i => i.registro.fecha).sort().pop();
  doc.save(`Mantenimiento_${items.length}_equipos_${fechaMax}.pdf`);
}

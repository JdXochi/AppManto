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

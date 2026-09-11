// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Generación de PDF de constancia por mantenimiento
// =========================================================
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

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

// equipo: { garita, tipo, serie, frecuencia_meses }
// registro: { fecha, tecnico_nombre, actividades, hallazgos }
// vobo: { nombre, puesto, tipo_firma, firmaDataUrl }
export function generarPDFConstancia(equipo, registro, vobo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  doc.setFillColor(31, 56, 100);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Constancia de Mantenimiento de Equipo", margin, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Xochi · Corredor de las Flores — Departamento de IT", margin, 48);

  doc.setTextColor(28, 36, 48);
  y = 96;
  const line = (label, value) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(String(value || "—"), pageW - margin * 2 - 170);
    doc.text(split, margin + 170, y);
    y += Math.max(16, split.length * 13 + 4);
  };

  line("Fecha de ejecución:", fmtDate(registro.fecha));
  line("Equipo (serie/código):", equipo.serie);
  line("Garita:", equipo.garita);
  line("Tipo de equipo:", equipo.tipo);
  line("Frecuencia:", `Cada ${equipo.frecuencia_meses} meses`);
  line("Próxima fecha programada:", fmtDate(addMonths(registro.fecha, equipo.frecuencia_meses)));
  y += 6;
  line("Técnico que realizó el mantenimiento:", registro.tecnico_nombre);
  line("Actividades realizadas:", registro.actividades);
  line("Hallazgos / Observaciones:", registro.hallazgos);

  y += 14;
  doc.setDrawColor(200, 200, 200); doc.line(margin, y, pageW - margin, y);
  y += 24;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Visto bueno", margin, y);
  y += 20;

  if (vobo.tipo_firma === "Digital" && vobo.firmaDataUrl) {
    doc.addImage(vobo.firmaDataUrl, "PNG", margin, y, 220, 80);
    y += 88;
  } else {
    doc.setDrawColor(28, 36, 48);
    doc.line(margin, y + 50, margin + 220, y + 50);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.text("Firma física (pendiente de firmar en papel)", margin, y + 64);
    y += 76;
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`${vobo.nombre || ""}`, margin, y);
  y += 14;
  doc.text(`${vobo.puesto || ""}`, margin, y);

  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Generado ${fmtDate(new Date().toISOString().slice(0,10))}`, margin, doc.internal.pageSize.getHeight() - 30);

  doc.save(`Mantenimiento_${equipo.serie}_${registro.fecha}.pdf`);
}

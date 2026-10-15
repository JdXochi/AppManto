// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// "Ver hoja": vuelve a generar el PDF de un mantenimiento ya registrado
// (lo usan Historial y la ficha del equipo)
// =========================================================
import { descargarFirmaDataUrl } from "./data.js";
import { generarPDFConstancia } from "./pdf.js";

// equipo:   { serie, tipo, garita, ubicacion, frecuencia_meses }
// registro: { fecha, tecnico_nombre, actividades, hallazgos }
// vobo:     { nombre, puesto, tipo_firma, firma_path }
// boton:    (opcional) botón que se bloquea mientras se genera
export async function verHoja({ equipo, registro, vobo = {}, boton = null }) {
  // Se abre la pestaña de inmediato (antes de esperar nada) para que el
  // navegador no la bloquee; luego se le carga el PDF.
  const ventana = window.open("", "_blank");
  if (ventana) ventana.document.write("<p style='font-family:sans-serif;padding:24px'>Generando hoja...</p>");

  const textoOriginal = boton ? boton.textContent : "";
  if (boton) { boton.disabled = true; boton.textContent = "Generando..."; }

  try {
    let firmaDataUrl = null;
    if (vobo.tipo_firma === "Digital" && vobo.firma_path) {
      try { firmaDataUrl = await descargarFirmaDataUrl(vobo.firma_path); }
      catch (e) { console.error("No se pudo cargar la firma:", e); }   // la hoja sale con aviso
    }
    await generarPDFConstancia(
      equipo,
      { fecha: registro.fecha, tecnico_nombre: registro.tecnico_nombre, actividades: registro.actividades, hallazgos: registro.hallazgos },
      { nombre: vobo.nombre, puesto: vobo.puesto, tipo_firma: vobo.tipo_firma, firmaDataUrl },
      { regenerada: true, abrirEn: ventana || null }
    );
  } catch (err) {
    if (ventana) ventana.close();
    alert("No se pudo generar la hoja: " + err.message);
  } finally {
    if (boton) { boton.disabled = false; boton.textContent = textoOriginal; }
  }
}

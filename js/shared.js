// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Constantes y helpers compartidos entre páginas
// =========================================================

export const GARITAS = ["G1", "G2", "G3", "G4", "Central"];

export function fillSelect(el, values, placeholder) {
  el.innerHTML = "";
  if (placeholder) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = placeholder;
    el.appendChild(o);
  }
  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
}

export function badgeClass(estado) {
  return estado.replace(" ", ".");
}

// Quita acentos para que las búsquedas encuentren "Lopez" aunque el dato
// guardado sea "López" (la gente no siempre escribe los acentos al buscar).
export function normalizarTexto(s) {
  return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Fecha de HOY en formato yyyy-mm-dd, usando la hora LOCAL del dispositivo
// (no UTC). Ojo: input.valueAsDate = new Date() se corre de día en Guatemala
// por las tardes/noches, porque interpreta la fecha en UTC, no en local.
export function hoyLocalISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Tipos de equipo presentes en una lista de equipos (para filtros).
// El catálogo "oficial" de tipos vive en tiposEquipoStore.js.
export function tiposDisponibles(equipos = []) {
  const set = new Set();
  equipos.forEach(e => { if (e.tipo) set.add(e.tipo); });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

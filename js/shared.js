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

// Tipos de equipo presentes en una lista de equipos (para filtros).
// El catálogo "oficial" de tipos vive en tiposEquipoStore.js.
export function tiposDisponibles(equipos = []) {
  const set = new Set();
  equipos.forEach(e => { if (e.tipo) set.add(e.tipo); });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

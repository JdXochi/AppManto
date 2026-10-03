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

// ---------------------------------------------------------------
// Seguridad / formato
// ---------------------------------------------------------------

// Escapa texto antes de meterlo en un innerHTML, para que lo que alguien
// escriba (ej. "<b>") se muestre como texto y no se ejecute como HTML.
export function esc(s) {
  return (s ?? "").toString()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Llena un <select> con pares {value, label} (cuando el valor no es igual al texto).
export function fillSelectPairs(el, pairs, placeholder) {
  el.innerHTML = "";
  if (placeholder) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = placeholder;
    el.appendChild(o);
  }
  pairs.forEach(p => {
    const o = document.createElement("option");
    o.value = p.value; o.textContent = p.label;
    el.appendChild(o);
  });
}

// ---------------------------------------------------------------
// Nombres de personas (encargados)
// ---------------------------------------------------------------

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

// "jose  CARLOS diaz" -> "Jose Carlos Diaz"  (respeta "de", "del", "la"...)
export function formatearNombre(s) {
  const limpio = (s || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!limpio) return "";
  return limpio.split(" ")
    .map((p, i) => (i > 0 && PARTICULAS.has(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function claveNombre(s) {
  return normalizarTexto(s).trim().replace(/\s+/g, " ");
}
function tokensNombre(s) {
  return claveNombre(s).split(" ").filter(t => t && !PARTICULAS.has(t));
}

// Busca en `lista` personas que podrían ser la misma que `nombre`:
//  - exactos:   mismo nombre (sin importar mayúsculas, acentos o espacios)
//  - parecidos: uno contiene todas las palabras del otro
//               ("Jose Diaz" vs "Jose Carlos Diaz Montes")
export function buscarEncargadosParecidos(nombre, lista, ignorarId = null) {
  const clave = claveNombre(nombre);
  const t = tokensNombre(nombre);
  const exactos = [], parecidos = [];
  lista.forEach(e => {
    if (e.id === ignorarId) return;
    if (claveNombre(e.nombre) === clave) { exactos.push(e); return; }
    const te = tokensNombre(e.nombre);
    const [corto, largo] = t.length <= te.length ? [t, te] : [te, t];
    if (corto.length >= 2 && corto.every(x => largo.includes(x))) parecidos.push(e);
  });
  return { exactos, parecidos };
}

// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Cache en memoria de la lista de equipos, compartida entre páginas
// (evita pedirle lo mismo a Supabase cada vez que cambias de pestaña)
// =========================================================
import { listEquipos } from "./data.js";

let cache = null;

export async function getEquipos(forzar = false) {
  if (!cache || forzar) cache = await listEquipos();
  return cache;
}

export function invalidateEquipos() {
  cache = null;
}

// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Cache en memoria del catálogo de tipos de equipo
// =========================================================
import { listTiposEquipo } from "./data.js";

let cache = null;

export async function getTiposEquipo(forzar = false) {
  if (!cache || forzar) cache = await listTiposEquipo();
  return cache;
}

export function invalidateTiposEquipo() {
  cache = null;
}

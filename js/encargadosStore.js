// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Cache en memoria de la lista de encargados
// =========================================================
import { listEncargados } from "./data.js";

let cache = null;

export async function getEncargados(forzar = false) {
  if (!cache || forzar) cache = await listEncargados();
  return cache;
}

export function invalidateEncargados() {
  cache = null;
}

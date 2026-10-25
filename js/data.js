// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Capa de acceso a datos (Supabase)
// =========================================================
import { supabase } from "./supabaseClient.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// ---------- Utilidad: traer TODAS las filas ----------
// Supabase devuelve como máximo 1,000 filas por consulta. Esta función pide
// por páginas hasta traer todo. `buildQuery` debe devolver la consulta con un
// orden determinista (incluyendo un campo único como último criterio) para que
// ninguna fila se repita ni se salte entre páginas.
async function fetchAll(buildQuery, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}

// ---------- Tipos de equipo (catálogo) ----------

export async function listTiposEquipo() {
  const { data, error } = await supabase
    .from("tipos_equipo")
    .select("id, descripcion, frecuencia_meses")
    .order("descripcion", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addTipoEquipo(tipo) {
  const { data, error } = await supabase
    .from("tipos_equipo")
    .insert(tipo)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTipoEquipo(id, cambios) {
  const { data, error } = await supabase
    .from("tipos_equipo")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Equipos (inventario) ----------

export async function listEquipos() {
  const data = await fetchAll(() => supabase
    .from("equipos")
    .select(`
      id, garita, ubicacion, serie, modelo, marca, ip, encargado_nombre, encargado_puesto, encargado_id, tipo_id,
      tipos_equipo ( descripcion, frecuencia_meses )
    `)
    .eq("activo", true)
    .order("garita", { ascending: true })
    .order("id", { ascending: true }));
  return data.map(e => ({
    ...e,
    tipo: e.tipos_equipo?.descripcion || "",
    frecuencia_meses: e.tipos_equipo?.frecuencia_meses ?? null,
  }));
}

export async function addEquipo(equipo) {
  const { data, error } = await supabase
    .from("equipos")
    .insert(equipo)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// cambios puede incluir: garita, ubicacion, serie, marca, modelo, ip, encargado_id
export async function updateEquipo(id, cambios) {
  const { data, error } = await supabase
    .from("equipos")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Seguimiento (estado por equipo, vista calculada) ----------

export async function listSeguimiento() {
  return fetchAll(() => supabase
    .from("seguimiento_equipos")
    .select("*")
    .order("garita", { ascending: true })
    .order("id", { ascending: true }));
}

// Reporte de inventario (vista reporte_inventario): equipos activos con
// ubicación, datos del equipo, encargado y estado de mantenimiento.
export async function listReporteInventario() {
  return fetchAll(() => supabase
    .from("reporte_inventario")
    .select("*")
    .order("garita", { ascending: true })
    .order("serie", { ascending: true })
    .order("id", { ascending: true }));
}

// ---------- Mantenimientos ----------

// opciones (todas opcionales): { desde: "YYYY-MM-DD", hasta: "YYYY-MM-DD" }
export async function listMantenimientos({ desde, hasta } = {}) {
  const data = await fetchAll(() => {
    let q = supabase
      .from("mantenimientos")
      .select(`
        id, equipo_id, fecha, tecnico_nombre, actividades, hallazgos, created_at,
        equipos ( garita, ubicacion, serie, tipos_equipo ( descripcion, frecuencia_meses ) ),
        vistos_buenos ( nombre, puesto, tipo_firma, firma_path )
      `);
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);
    return q.order("fecha", { ascending: false }).order("id", { ascending: true });
  });
  return data.map(r => ({
    ...r,
    equipos: r.equipos ? {
      garita: r.equipos.garita,
      ubicacion: r.equipos.ubicacion || "",
      serie: r.equipos.serie,
      tipo: r.equipos.tipos_equipo?.descripcion || "",
      frecuencia_meses: r.equipos.tipos_equipo?.frecuencia_meses ?? null,
    } : null,
  }));
}

// Versión liviana para la pantalla de Inicio: solo lo necesario para contar
// mantenimientos por mes y mostrar la actividad reciente.
export async function listActividadMantenimientos(desde) {
  const data = await fetchAll(() => {
    let q = supabase
      .from("mantenimientos")
      .select("id, equipo_id, fecha, created_at, tecnico_nombre, equipos ( garita, serie, tipos_equipo ( descripcion ) )");
    if (desde) q = q.gte("fecha", desde);
    return q.order("fecha", { ascending: false }).order("id", { ascending: true });
  });
  return data.map(r => ({
    id: r.id,
    equipo_id: r.equipo_id,
    fecha: r.fecha,
    created_at: r.created_at,
    tecnico_nombre: r.tecnico_nombre,
    garita: r.equipos?.garita || "",
    serie: r.equipos?.serie || "",
    tipo: r.equipos?.tipos_equipo?.descripcion || "",
  }));
}

// Cambios de hardware desde una fecha (para el Inicio). Versión liviana.
export async function listCambiosHardwareReciente(desde) {
  const data = await fetchAll(() => {
    let q = supabase
      .from("cambios_hardware")
      .select(`id, equipo_id, fecha, created_at, accion, costo, tecnico_nombre,
               categorias_hardware ( descripcion ),
               equipos ( garita, serie, tipos_equipo ( descripcion ) )`);
    if (desde) q = q.gte("fecha", desde);
    return q.order("fecha", { ascending: false }).order("id", { ascending: true });
  });
  return data.map(r => ({
    id: r.id,
    equipo_id: r.equipo_id,
    fecha: r.fecha,
    created_at: r.created_at,
    accion: r.accion,
    costo: r.costo === null || r.costo === undefined ? null : Number(r.costo),
    tecnico_nombre: r.tecnico_nombre,
    categoria: r.categorias_hardware?.descripcion || "",
    garita: r.equipos?.garita || "",
    serie: r.equipos?.serie || "",
    tipo: r.equipos?.tipos_equipo?.descripcion || "",
  }));
}

// Cuántos equipos están fuera de servicio (bodega, reparación o baja)
export async function contarEquiposRetirados() {
  const { count, error } = await supabase
    .from("equipos")
    .select("id", { count: "exact", head: true })
    .eq("activo", false);
  if (error) throw error;
  return count || 0;
}

// ---------- Ficha del equipo ----------

// Datos del equipo con su estado (vista reporte_inventario). Si el equipo está
// fuera de servicio (no aparece en la vista) se arma desde la tabla equipos.
// Devuelve null si no existe.
export async function getEquipoFicha(equipoId) {
  const { data, error } = await supabase
    .from("reporte_inventario")
    .select("*")
    .eq("id", equipoId)
    .limit(1);
  if (error) throw error;
  if (data && data.length) return data[0];

  const r = await supabase
    .from("equipos")
    .select(`id, garita, ubicacion, serie, marca, modelo, ip, encargado_nombre, encargado_puesto,
             activo, baja_tipo, baja_motivo, baja_fecha, tipos_equipo ( descripcion, frecuencia_meses )`)
    .eq("id", equipoId)
    .limit(1);
  if (r.error) throw r.error;
  if (!r.data || !r.data.length) return null;
  const e = r.data[0];
  return {
    id: e.id,
    garita: e.garita,
    ubicacion: e.ubicacion,
    tipo: e.tipos_equipo?.descripcion || "",
    serie: e.serie,
    marca: e.marca,
    modelo: e.modelo,
    ip: e.ip,
    encargado_nombre: e.encargado_nombre,
    encargado_puesto: e.encargado_puesto,
    frecuencia_meses: e.tipos_equipo?.frecuencia_meses ?? null,
    ultima_fecha: null,
    proxima_fecha: null,
    estado: e.baja_tipo || "Fuera de servicio",
    fuera_servicio: !e.activo,
    baja_tipo: e.baja_tipo,
    baja_motivo: e.baja_motivo,
    baja_fecha: e.baja_fecha,
  };
}

// ---------- Baja de equipos (solo admin; lo valida también la base de datos) ----------

// baja_tipo: "En bodega" | "En reparación" | "Dado de baja"
export async function retirarEquipo(id, { baja_tipo, baja_motivo, baja_fecha }) {
  return updateEquipo(id, { activo: false, baja_tipo, baja_motivo, baja_fecha });
}

export async function reactivarEquipo(id) {
  return updateEquipo(id, { activo: true });
}

export async function listEquiposRetirados() {
  const data = await fetchAll(() => supabase
    .from("equipos")
    .select("id, garita, ubicacion, serie, baja_tipo, baja_motivo, baja_fecha, tipos_equipo ( descripcion )")
    .eq("activo", false)
    .order("baja_fecha", { ascending: false })
    .order("id", { ascending: true }));
  return data.map(e => ({ ...e, tipo: e.tipos_equipo?.descripcion || "" }));
}

export async function listMantenimientosDeEquipo(equipoId) {
  return fetchAll(() => supabase
    .from("mantenimientos")
    .select("id, fecha, created_at, tecnico_nombre, actividades, hallazgos, vistos_buenos ( nombre, puesto, tipo_firma, firma_path )")
    .eq("equipo_id", equipoId)
    .order("fecha", { ascending: false })
    .order("id", { ascending: true }));
}

export async function listCambiosHardwareDeEquipo(equipoId) {
  const data = await fetchAll(() => supabase
    .from("cambios_hardware")
    .select("id, fecha, accion, descripcion, costo, tecnico_nombre, categorias_hardware ( descripcion )")
    .eq("equipo_id", equipoId)
    .order("fecha", { ascending: false })
    .order("id", { ascending: true }));
  return data.map(r => ({ ...r, categoria: r.categorias_hardware?.descripcion || "" }));
}

// ---------- Bitácora de movimientos (solo admin) ----------
// filtros (todos opcionales): { desde, hasta, tabla, accion, usuario, texto }
// Devuelve una página de `limite` filas a partir de `offset`, de la más reciente a la más antigua.
export async function listBitacora({ desde, hasta, tabla, accion, usuario, texto, limite = 100, offset = 0 } = {}) {
  let q = supabase
    .from("bitacora")
    .select("id, created_at, usuario_nombre, accion, tabla, descripcion, antes, despues");
  // Guatemala siempre es UTC-6 (sin horario de verano)
  if (desde) q = q.gte("created_at", `${desde}T00:00:00-06:00`);
  if (hasta) q = q.lte("created_at", `${hasta}T23:59:59.999-06:00`);
  if (tabla) q = q.eq("tabla", tabla);
  if (accion) q = q.eq("accion", accion);
  if (usuario) q = q.ilike("usuario_nombre", `%${usuario}%`);
  if (texto) q = q.ilike("descripcion", `%${texto}%`);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limite - 1);
  if (error) throw error;
  return data;
}

export async function addMantenimiento(registro) {
  const { data, error } = await supabase
    .from("mantenimientos")
    .insert(registro)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMantenimiento(id) {
  const { error } = await supabase.from("mantenimientos").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Vistos buenos ----------

export async function addVistoBueno(vobo) {
  const { data, error } = await supabase
    .from("vistos_buenos")
    .insert(vobo)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Firmas (Supabase Storage) ----------

// Sube una firma (dataURL PNG) al bucket "firmas" y devuelve la ruta guardada.
export async function subirFirma(mantenimientoId, dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `${mantenimientoId}.png`;
  const { error } = await supabase.storage.from("firmas").upload(path, blob, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

// Descarga la imagen de una firma guardada y la devuelve como dataURL (para incrustarla en el PDF).
export async function descargarFirmaDataUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("firmas").download(path);
  if (error) throw error;
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("No se pudo leer la imagen de la firma."));
    r.readAsDataURL(data);
  });
}

// Genera una URL temporal para poder ver/descargar una firma guardada.
export async function urlFirma(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("firmas").createSignedUrl(path, 60 * 10);
  if (error) { console.error(error); return null; }
  return data.signedUrl;
}

// ---------- Usuarios (perfiles) ----------

export async function listPerfiles() {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, username, nombre, rol, activo, debe_cambiar_password")
    .order("username", { ascending: true });
  if (error) throw error;
  return data;
}

// cambios puede incluir: nombre, rol, activo
export async function updatePerfil(id, cambios) {
  const { data, error } = await supabase
    .from("perfiles")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Crea un usuario nuevo (cuenta de acceso + fila en "perfiles") a través de
// la Edge Function "crear-usuario" -- es la única operación que de verdad
// necesita privilegios de administrador de Supabase, por eso no se hace
// directo desde aquí.
export async function crearUsuario({ username, nombre, rol, password }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sesión no encontrada.");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/crear-usuario`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ username, nombre, rol, password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error (${res.status})`);
  return body;
}

// ---------- Encargados (personas responsables de los equipos) ----------

export async function listEncargados() {
  const { data, error } = await supabase
    .from("encargados")
    .select("id, nombre, puesto, activo")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addEncargado(encargado) {
  const { data, error } = await supabase
    .from("encargados")
    .insert(encargado)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// cambios puede incluir: nombre, puesto, activo
export async function updateEncargado(id, cambios) {
  const { data, error } = await supabase
    .from("encargados")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Pasa todos los equipos de "origen" a "destino" y elimina "origen" (solo admin).
export async function fusionarEncargados(origen, destino) {
  const { error } = await supabase.rpc("fusionar_encargados", { origen, destino });
  if (error) throw error;
}

// ---------- Cambios de hardware ----------

export async function listCategoriasHardware() {
  const { data, error } = await supabase
    .from("categorias_hardware")
    .select("id, descripcion")
    .order("descripcion", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addCategoriaHardware(descripcion) {
  const { data, error } = await supabase
    .from("categorias_hardware")
    .insert({ descripcion })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCambiosHardware() {
  const data = await fetchAll(() => supabase
    .from("cambios_hardware")
    .select(`
      id, equipo_id, fecha, accion, descripcion, costo, tecnico_nombre, created_at,
      categorias_hardware ( descripcion ),
      equipos ( garita, ubicacion, serie, tipos_equipo ( descripcion ) )
    `)
    .order("fecha", { ascending: false })
    .order("id", { ascending: true }));
  return data.map(r => ({
    ...r,
    categoria: r.categorias_hardware?.descripcion || "",
    equipo: r.equipos ? {
      garita: r.equipos.garita,
      ubicacion: r.equipos.ubicacion || "",
      serie: r.equipos.serie,
      tipo: r.equipos.tipos_equipo?.descripcion || "",
    } : null,
  }));
}

export async function addCambioHardware(registro) {
  const { data, error } = await supabase
    .from("cambios_hardware")
    .insert(registro)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCambioHardware(id) {
  const { error } = await supabase.from("cambios_hardware").delete().eq("id", id);
  if (error) throw error;
}

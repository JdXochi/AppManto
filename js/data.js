// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Capa de acceso a datos (Supabase)
// =========================================================
import { supabase } from "./supabaseClient.js";

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
  const { data, error } = await supabase
    .from("equipos")
    .select(`
      id, garita, serie, modelo, marca, encargado_nombre, encargado_puesto, tipo_id,
      tipos_equipo ( descripcion, frecuencia_meses )
    `)
    .eq("activo", true)
    .order("garita", { ascending: true });
  if (error) throw error;
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

// ---------- Seguimiento (estado por equipo, vista calculada) ----------

export async function listSeguimiento() {
  const { data, error } = await supabase
    .from("seguimiento_equipos")
    .select("*")
    .order("garita", { ascending: true });
  if (error) throw error;
  return data;
}

// ---------- Mantenimientos ----------

export async function listMantenimientos() {
  const { data, error } = await supabase
    .from("mantenimientos")
    .select(`
      id, fecha, tecnico_nombre, actividades, hallazgos, created_at,
      equipos ( garita, serie, tipos_equipo ( descripcion, frecuencia_meses ) ),
      vistos_buenos ( nombre, puesto, tipo_firma, firma_path )
    `)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data.map(r => ({
    ...r,
    equipos: r.equipos ? {
      garita: r.equipos.garita,
      serie: r.equipos.serie,
      tipo: r.equipos.tipos_equipo?.descripcion || "",
      frecuencia_meses: r.equipos.tipos_equipo?.frecuencia_meses ?? null,
    } : null,
  }));
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

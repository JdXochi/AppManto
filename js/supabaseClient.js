// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Cliente de Supabase compartido
// =========================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------
// Helpers de sesión / perfil, usados por todas las páginas
// -----------------------------------------------------------------

// Devuelve la sesión activa, o null si no hay nadie logueado.
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) { console.error(error); return null; }
  return data.session;
}

// Devuelve el perfil (nombre, rol, username) del usuario logueado.
export async function getPerfilActual() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("perfiles")
    .select("nombre, username, rol, activo, debe_cambiar_password")
    .eq("id", session.user.id)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// Protege una página: si no hay sesión, redirige al login. Además, a menos
// que se pida lo contrario, obliga a pasar primero por el cambio de
// contraseña si la cuenta lo requiere, y cierra la sesión si fue desactivada.
export async function requireSession(opts = {}) {
  const session = await getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  if (!opts.skipPasswordCheck) {
    const { data } = await supabase
      .from("perfiles")
      .select("activo, debe_cambiar_password")
      .eq("id", session.user.id)
      .single();
    if (data) {
      if (!data.activo) {
        await supabase.auth.signOut();
        window.location.href = "index.html?desactivado=1";
        return null;
      }
      if (data.debe_cambiar_password) {
        window.location.href = "cambiar-password.html";
        return null;
      }
    }
  }
  return session;
}

// Marca la contraseña del usuario ACTUAL como ya actualizada (RPC acotado,
// no permite editar rol/nombre/otros campos del perfil).
export async function marcarPasswordCambiada() {
  const { error } = await supabase.rpc("marcar_password_cambiada");
  if (error) throw error;
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

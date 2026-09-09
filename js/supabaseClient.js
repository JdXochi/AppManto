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
    .select("nombre, username, rol")
    .eq("id", session.user.id)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// Protege una página: si no hay sesión, redirige al login.
// Uso: al inicio de cada página protegida, await requireSession();
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

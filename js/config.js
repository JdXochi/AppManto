// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Configuración de conexión a Supabase
// =========================================================
// La "anon key" es segura para exponerse en el navegador y en este
// repositorio: todo el acceso real está controlado por las políticas
// de seguridad (RLS) configuradas en la base de datos, no por esta
// llave. NUNCA pongas aquí la "service_role key" — esa sí es secreta.

export const SUPABASE_URL = "https://lddzsfzjvplekghzpczm.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHpzZnpqdnBsZWtnaHpwY3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDE5OTIsImV4cCI6MjEwNDQ3Nzk5Mn0.HUYNLQ6uApHeRfdQTi-PNqQz2g72pXStFkuIfIUZA_Y";

// Dominio interno usado para armar el correo a partir del "usuario"
// (ej. "jdiaz" -> "jdiaz@xochi.local"). Nunca se envía correo real ahí.
export const AUTH_DOMAIN = "xochi.local";

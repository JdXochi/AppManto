// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Cierre de sesión automático por inactividad
// Guardar como: js/inactividad.js
// =========================================================

const AVISO_SEGUNDOS = 30; // cuántos segundos antes se muestra el aviso

export function iniciarTemporizadorInactividad(alExpirar, minutos = 5) {
  const limite = minutos * 60 * 1000;
  const aviso = AVISO_SEGUNDOS * 1000;
  let ultimaActividad = Date.now();
  let cerrando = false;

  // ---- Aviso visual ----
  const banner = document.createElement("div");
  banner.style.cssText =
    "position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:9999;" +
    "display:none; align-items:center; gap:12px; padding:12px 16px; border-radius:10px;" +
    "background:#1F2937; color:#fff; box-shadow:0 6px 20px rgba(0,0,0,.25);" +
    "font-size:14px; max-width:92vw;";
  const texto = document.createElement("span");
  const btn = document.createElement("button");
  btn.textContent = "Seguir conectado";
  btn.style.cssText =
    "border:0; border-radius:8px; padding:8px 12px; cursor:pointer;" +
    "background:#fff; color:#1F2937; font-weight:600;";
  banner.append(texto, btn);
  document.body.appendChild(banner);

  function registrarActividad() {
    // Si el aviso ya está visible, solo el botón (o un clic/tecla) lo reinicia.
    ultimaActividad = Date.now();
    banner.style.display = "none";
  }

  // Eventos que cuentan como "estoy usando la app"
  ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"].forEach(ev =>
    window.addEventListener(ev, registrarActividad, { passive: true })
  );
  btn.addEventListener("click", registrarActividad);

  // Revisa cada segundo. Comparar contra la hora real (y no con un solo
  // setTimeout) hace que funcione bien aunque la computadora se suspenda
  // o la pestaña quede en segundo plano.
  function revisar() {
    if (cerrando) return;
    const inactivo = Date.now() - ultimaActividad;

    if (inactivo >= limite) {
      cerrando = true;
      banner.style.display = "none";
      alExpirar();
      return;
    }
    if (inactivo >= limite - aviso) {
      const restante = Math.ceil((limite - inactivo) / 1000);
      texto.textContent = `Por inactividad, se cerrará tu sesión en ${restante} s.`;
      banner.style.display = "flex";
    }
  }

  setInterval(revisar, 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) revisar();
  });
}

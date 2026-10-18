// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Ventana para retirar un equipo de servicio (tipo, motivo y fecha)
// =========================================================
import { esc, hoyLocalISO } from "./shared.js";

const AYUDA = {
  "En bodega": "Guardado sin usar. Cuando vuelva a operar se reactiva.",
  "En reparación": "Fuera de operación temporalmente, mientras se repara.",
  "Dado de baja": "Retiro definitivo del inventario activo.",
};

const CSS = `
.rt-overlay{ position:fixed; inset:0; background:rgba(10,20,35,.6); z-index:1200; display:flex; align-items:center; justify-content:center; padding:16px; }
.rt-dialog{ background:#fff; border-radius:16px; width:min(480px,100%); max-height:92vh; overflow-y:auto; padding:24px 24px 20px; box-shadow:0 20px 60px rgba(10,20,35,.4); }
.rt-dialog h2{ margin:0 0 4px; color:var(--navy,#14406D); font-size:19px; }
.rt-sub{ margin:0 0 14px; color:var(--muted,#66707C); font-size:13.5px; }
.rt-info{ background:#EAF2FB; color:#1F5F9E; border-radius:10px; padding:10px 13px; font-size:13px; line-height:1.45; margin-bottom:16px; }
.rt-dialog label{ display:block; font-size:13px; font-weight:700; color:var(--ink,#14202E); margin:12px 0 5px; }
.rt-dialog select, .rt-dialog textarea, .rt-dialog input{ width:100%; box-sizing:border-box; }
.rt-dialog textarea{ min-height:80px; resize:vertical; }
.rt-ayuda{ margin:5px 0 0; font-size:12.5px; color:var(--muted,#66707C); min-height:16px; }
.rt-error{ margin:12px 0 0; font-size:13px; color:#B42318; min-height:16px; }
.rt-botones{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; flex-wrap:wrap; }
.rt-peligro{ background:#D92D20; color:#fff; border:none; padding:11px 22px; border-radius:9px; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; }
.rt-peligro:hover{ background:#B42318; }
`;

let estiloListo = false;

// Devuelve { baja_tipo, baja_motivo, baja_fecha } o null si se cancela.
export function pedirRetiro(equipo) {
  if (!estiloListo) {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    estiloListo = true;
  }

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "rt-overlay";
    overlay.innerHTML = `
      <div class="rt-dialog" role="dialog" aria-modal="true" aria-label="Retirar equipo de servicio">
        <h2>Retirar de servicio</h2>
        <p class="rt-sub">Equipo <b>${esc(equipo.serie)}</b>${equipo.tipo ? " · " + esc(equipo.tipo) : ""}</p>
        <div class="rt-info">Dejará de contar en los pendientes y en el cumplimiento. Su historial se conserva y podrás reactivarlo cuando vuelva a operar.</div>

        <label for="rt-tipo">¿Qué pasó con el equipo?</label>
        <select id="rt-tipo">
          <option value="">Selecciona...</option>
          ${Object.keys(AYUDA).map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>
        <p class="rt-ayuda" id="rt-ayuda"></p>

        <label for="rt-motivo">Motivo</label>
        <textarea id="rt-motivo" placeholder="Ej. Se dañó la tarjeta madre y no tiene reparación"></textarea>

        <label for="rt-fecha">Fecha</label>
        <input type="date" id="rt-fecha">

        <p class="rt-error" id="rt-error"></p>
        <div class="rt-botones">
          <button class="ghost" id="rt-cancelar" type="button">Cancelar</button>
          <button class="rt-peligro" id="rt-ok" type="button">Retirar equipo</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const $ = s => overlay.querySelector(s);
    $("#rt-fecha").value = hoyLocalISO();
    $("#rt-fecha").max = hoyLocalISO();
    $("#rt-tipo").focus();

    function cerrar(resultado) {
      document.removeEventListener("keydown", alTeclear);
      overlay.remove();
      resolve(resultado);
    }
    function alTeclear(e) { if (e.key === "Escape") cerrar(null); }
    document.addEventListener("keydown", alTeclear);

    $("#rt-tipo").addEventListener("change", () => { $("#rt-ayuda").textContent = AYUDA[$("#rt-tipo").value] || ""; });
    ["#rt-tipo", "#rt-motivo", "#rt-fecha"].forEach(sel =>
      $(sel).addEventListener("input", () => { $("#rt-error").textContent = ""; }));
    $("#rt-cancelar").addEventListener("click", () => cerrar(null));
    overlay.addEventListener("click", e => { if (e.target === overlay) cerrar(null); });

    $("#rt-ok").addEventListener("click", () => {
      const tipo = $("#rt-tipo").value;
      const motivo = $("#rt-motivo").value.trim();
      const fecha = $("#rt-fecha").value;
      const error = t => { $("#rt-error").textContent = t; };

      if (!tipo) return error("Selecciona qué pasó con el equipo.");
      if (!motivo) return error("Escribe el motivo.");
      if (!fecha) return error("Selecciona la fecha.");
      if (fecha > hoyLocalISO()) return error("La fecha no puede ser futura.");

      cerrar({ baja_tipo: tipo, baja_motivo: motivo, baja_fecha: fecha });
    });
  });
}

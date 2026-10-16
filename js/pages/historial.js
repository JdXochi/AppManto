// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Historial de mantenimientos
// =========================================================
import { listMantenimientos, deleteMantenimiento } from "../data.js";
import { verHoja } from "../verHoja.js";
import { GARITAS, fillSelect, normalizarTexto, esc, DIAS_ALERTA_REGISTRO, diasRegistroTardio, fmtFechaHoraGT } from "../shared.js";
import { fmtDate } from "../pdf.js";

export async function render(container, { ROL }) {
  container.innerHTML = `
    <div class="card">
      <h2>Historial de mantenimientos</h2>
      <div class="filters">
        <input type="text" id="filter-busqueda-hist" placeholder="Buscar por serie, tipo, ubicación, actividades, técnico o quien confirmó..." style="flex:1; min-width:220px;">
        <select id="filter-garita-hist"><option value="">Todas las garitas</option></select>
        <select id="filter-firma-hist">
          <option value="">Cualquier tipo de firma</option>
          <option value="Digital">Firma digital</option>
          <option value="Física">Firma física</option>
        </select>
      </div>
      <div class="filters">
        <div class="field" style="margin-bottom:0">
          <label for="filter-desde-hist" class="hint">Desde</label>
          <input type="date" id="filter-desde-hist">
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="filter-hasta-hist" class="hint">Hasta</label>
          <input type="date" id="filter-hasta-hist">
        </div>
        <div class="field" style="margin-bottom:0; align-self:flex-end;">
          <button class="secondary" id="btn-limpiar-filtros-hist" type="button">Limpiar filtros</button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table id="tabla-historial" class="responsive-cards">
          <thead><tr><th>Fecha</th><th>Serie</th><th>Garita / Tipo</th><th>Ubicación</th><th>Actividades realizadas</th><th>Hallazgos</th><th>Técnico</th><th>Confirmó</th><th>Firma</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="hist-empty" style="display:none">Aún no hay mantenimientos registrados.</p>
    </div>
  `;

  fillSelect(container.querySelector("#filter-garita-hist"), GARITAS, "Todas las garitas");

  const inputs = ["#filter-busqueda-hist", "#filter-garita-hist", "#filter-firma-hist", "#filter-desde-hist", "#filter-hasta-hist"]
    .map(sel => container.querySelector(sel));
  inputs.forEach(el => el.addEventListener(el.type === "text" || el.type === "date" ? "input" : "change", renderTabla));

  container.querySelector("#btn-limpiar-filtros-hist").addEventListener("click", () => {
    inputs.forEach(el => el.value = "");
    renderTabla();
  });

  async function renderTabla() {
    const registros = await listMantenimientos();
    const fg = container.querySelector("#filter-garita-hist").value;
    const ff = container.querySelector("#filter-firma-hist").value;
    const desde = container.querySelector("#filter-desde-hist").value;
    const hasta = container.querySelector("#filter-hasta-hist").value;
    const q = normalizarTexto(container.querySelector("#filter-busqueda-hist").value.trim());

    const filtrados = registros.filter(r => {
      const eq = r.equipos || {};
      const vobo = (r.vistos_buenos && r.vistos_buenos[0]) || {};
      if (fg && eq.garita !== fg) return false;
      if (ff && vobo.tipo_firma !== ff) return false;
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      if (q) {
        const texto = normalizarTexto([eq.serie, eq.tipo, eq.ubicacion, r.actividades, r.hallazgos, r.tecnico_nombre, vobo.nombre, vobo.puesto].filter(Boolean).join(" "));
        if (!texto.includes(q)) return false;
      }
      return true;
    });

    const tbody = container.querySelector("#tabla-historial tbody");
    tbody.innerHTML = "";
    container.querySelector("#hist-empty").style.display = filtrados.length ? "none" : "block";

    filtrados.forEach(r => {
      const eq = r.equipos || {};
      const vobo = (r.vistos_buenos && r.vistos_buenos[0]) || {};
      const diasTarde = diasRegistroTardio(r.fecha, r.created_at);
      const tarde = diasTarde > DIAS_ALERTA_REGISTRO;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Fecha">${fmtDate(r.fecha)}<small style="display:block; margin-top:3px; font-size:11.5px; ${tarde ? "color:#B8620A; font-weight:700" : "color:var(--muted)"}">Registrado ${fmtFechaHoraGT(r.created_at)}${tarde ? ` · ${diasTarde} días después` : ""}</small></td>
        <td data-label="Serie"><b data-ficha="${esc(r.equipo_id)}" title="Ver ficha del equipo">${esc(eq.serie)}</b></td>
        <td data-label="Garita / Tipo">${esc(eq.garita)} / ${esc(eq.tipo)}</td>
        <td data-label="Ubicación">${esc(eq.ubicacion)}</td>
        <td data-label="Actividades realizadas" style="min-width:200px; white-space:pre-line">${esc(r.actividades)}</td>
        <td data-label="Hallazgos" style="min-width:160px; white-space:pre-line">${esc(r.hallazgos)}</td>
        <td data-label="Técnico">${esc(r.tecnico_nombre)}</td>
        <td data-label="Confirmó">${esc(vobo.nombre)}${vobo.puesto ? " · " + esc(vobo.puesto) : ""}</td>
        <td data-label="Firma">${esc(vobo.tipo_firma)}</td>
        <td data-label="Acciones">
          <button class="secondary" data-ver="${esc(r.id)}">Ver hoja</button>
          ${ROL === "admin" ? `<button class="ghost" data-id="${esc(r.id)}">Eliminar</button>` : ""}
        </td>`;
      tbody.appendChild(tr);
    });

    // ---- Ver hoja: se vuelve a generar el PDF con lo que quedó registrado ----
    const porId = new Map(filtrados.map(r => [r.id, r]));
    tbody.querySelectorAll("[data-ver]").forEach(btn => btn.addEventListener("click", () => {
      const r = porId.get(btn.dataset.ver);
      if (!r) return;
      verHoja({
        equipo: r.equipos || {},
        registro: r,
        vobo: (r.vistos_buenos && r.vistos_buenos[0]) || {},
        boton: btn,
      });
    }));

    tbody.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
      try {
        await deleteMantenimiento(btn.dataset.id);
        await renderTabla();
      } catch (err) { alert("No se pudo eliminar: " + err.message); }
    }));
  }

  await renderTabla();
}

// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Estado de equipos
// =========================================================
import { listSeguimiento } from "../data.js";
import { GARITAS, fillSelect, badgeClass } from "../shared.js";
import { fmtDate } from "../pdf.js";

export async function render(container) {
  container.innerHTML = `
    <div class="summary" id="summary-stats"></div>
    <div class="card">
      <h2>Estado por equipo</h2>
      <div class="filters">
        <select id="filter-garita-estado"><option value="">Todas las garitas</option></select>
        <select id="filter-status-estado">
          <option value="">Todos los estados</option>
          <option value="Vigente">Vigente</option>
          <option value="Próximo">Próximo</option>
          <option value="Atrasado">Atrasado</option>
          <option value="Sin registro">Sin registro</option>
        </select>
      </div>
      <div style="overflow-x:auto">
        <table id="tabla-estado">
          <thead><tr><th>Garita</th><th>Tipo</th><th>Serie</th><th>Encargado</th><th>Última fecha</th><th>Próxima fecha</th><th>Estado</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  fillSelect(container.querySelector("#filter-garita-estado"), GARITAS, "Todas las garitas");
  container.querySelector("#filter-garita-estado").addEventListener("change", renderTabla);
  container.querySelector("#filter-status-estado").addEventListener("change", renderTabla);

  async function renderTabla() {
    const seguimiento = await listSeguimiento();
    const fg = container.querySelector("#filter-garita-estado").value;
    const fs = container.querySelector("#filter-status-estado").value;
    const counts = { "Vigente": 0, "Próximo": 0, "Atrasado": 0, "Sin registro": 0 };
    seguimiento.forEach(s => counts[s.estado] = (counts[s.estado] || 0) + 1);

    container.querySelector("#summary-stats").innerHTML = `
      <div class="stat"><div class="n">${counts["Vigente"]||0}</div><div class="l">Vigentes</div></div>
      <div class="stat"><div class="n">${counts["Próximo"]||0}</div><div class="l">Próximos (≤15 días)</div></div>
      <div class="stat"><div class="n">${counts["Atrasado"]||0}</div><div class="l">Atrasados</div></div>
      <div class="stat"><div class="n">${counts["Sin registro"]||0}</div><div class="l">Sin registro</div></div>`;

    const tbody = container.querySelector("#tabla-estado tbody");
    tbody.innerHTML = "";
    seguimiento
      .filter(s => (!fg || s.garita === fg) && (!fs || s.estado === fs))
      .forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${s.garita}</td><td>${s.tipo}</td><td><b>${s.serie}</b></td><td>${s.encargado_nombre||""}</td>
          <td>${s.ultima_fecha ? fmtDate(s.ultima_fecha) : "—"}</td><td>${s.proxima_fecha ? fmtDate(s.proxima_fecha) : "—"}</td>
          <td><span class="badge ${badgeClass(s.estado)}">${s.estado}</span></td>`;
        tbody.appendChild(tr);
      });
  }

  await renderTabla();
}

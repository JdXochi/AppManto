// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Reportes (totales generales — visible para todos los roles)
// =========================================================
import { getEquipos } from "../equiposStore.js";

export async function render(container) {
  container.innerHTML = `
    <div class="summary" id="reportes-stats"></div>
    <div class="card">
      <h2>Equipos por garita</h2>
      <div style="overflow-x:auto">
        <table id="tabla-reportes-garita">
          <thead><tr><th>Garita</th><th>Cantidad de equipos</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h2>Equipos por tipo</h2>
      <div style="overflow-x:auto">
        <table id="tabla-reportes-tipo">
          <thead><tr><th>Tipo de equipo</th><th>Cantidad</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const equipos = await getEquipos();

  container.querySelector("#reportes-stats").innerHTML = `
    <div class="stat"><div class="n">${equipos.length}</div><div class="l">Equipos monitoreados</div></div>
    <div class="stat"><div class="n">${new Set(equipos.map(e=>e.garita)).size}</div><div class="l">Garitas / sitios</div></div>
    <div class="stat"><div class="n">${new Set(equipos.map(e=>e.tipo)).size}</div><div class="l">Tipos de equipo</div></div>`;

  const porGarita = {};
  const porTipo = {};
  equipos.forEach(e => {
    porGarita[e.garita] = (porGarita[e.garita]||0) + 1;
    porTipo[e.tipo] = (porTipo[e.tipo]||0) + 1;
  });

  const tbG = container.querySelector("#tabla-reportes-garita tbody");
  Object.entries(porGarita).forEach(([g, n]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${g}</td><td>${n}</td>`;
    tbG.appendChild(tr);
  });

  const tbT = container.querySelector("#tabla-reportes-tipo tbody");
  Object.entries(porTipo).forEach(([t, n]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${t}</td><td>${n}</td>`;
    tbT.appendChild(tr);
  });
}

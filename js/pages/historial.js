// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Historial de mantenimientos
// =========================================================
import { listMantenimientos, deleteMantenimiento } from "../data.js";
import { GARITAS, fillSelect } from "../shared.js";
import { fmtDate } from "../pdf.js";

export async function render(container, { ROL }) {
  container.innerHTML = `
    <div class="card">
      <h2>Historial de mantenimientos</h2>
      <div class="filters">
        <select id="filter-garita-hist"><option value="">Todas las garitas</option></select>
      </div>
      <div style="overflow-x:auto">
        <table id="tabla-historial" class="responsive-cards">
          <thead><tr><th>Fecha</th><th>Serie</th><th>Garita / Tipo</th><th>Técnico</th><th>Vo.Bo.</th><th>Firma</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="hist-empty" style="display:none">Aún no hay mantenimientos registrados.</p>
    </div>
  `;

  fillSelect(container.querySelector("#filter-garita-hist"), GARITAS, "Todas las garitas");
  container.querySelector("#filter-garita-hist").addEventListener("change", renderTabla);

  async function renderTabla() {
    const registros = await listMantenimientos();
    const fg = container.querySelector("#filter-garita-hist").value;

    const tbody = container.querySelector("#tabla-historial tbody");
    tbody.innerHTML = "";
    const filtrados = registros.filter(r => !fg || (r.equipos && r.equipos.garita === fg));
    container.querySelector("#hist-empty").style.display = filtrados.length ? "none" : "block";

    filtrados.forEach(r => {
      const eq = r.equipos || {};
      const vobo = (r.vistos_buenos && r.vistos_buenos[0]) || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Fecha">${fmtDate(r.fecha)}</td>
        <td data-label="Serie"><b>${eq.serie||""}</b></td>
        <td data-label="Garita / Tipo">${eq.garita||""} / ${eq.tipo||""}</td>
        <td data-label="Técnico">${r.tecnico_nombre||""}</td>
        <td data-label="Vo.Bo.">${vobo.nombre||""}${vobo.puesto ? " · "+vobo.puesto : ""}</td>
        <td data-label="Firma">${vobo.tipo_firma||""}</td>
        <td data-label="Acciones">${ROL === "admin" ? `<button class="ghost" data-id="${r.id}">Eliminar</button>` : ""}</td>`;
      tbody.appendChild(tr);
    });

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

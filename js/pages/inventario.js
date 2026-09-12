// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Inventario de equipos
// =========================================================
import { getEquipos, invalidateEquipos } from "../equiposStore.js";
import { addEquipo } from "../data.js";
import { TIPOS_FRECUENCIA, GARITAS, fillSelect } from "../shared.js";

export async function render(container, { ROL }) {
  container.innerHTML = `
    <div class="card" id="card-agregar-equipo" style="display:none">
      <h2>Agregar equipo al inventario</h2>
      <p class="sub">Una fila por cada unidad física, identificada por su serie o código.</p>
      <div class="grid3">
        <div class="field">
          <label for="i-garita">Garita</label>
          <select id="i-garita"></select>
        </div>
        <div class="field">
          <label for="i-tipo">Tipo de equipo</label>
          <select id="i-tipo"></select>
        </div>
        <div class="field">
          <label for="i-serie">Serie / Código de inventario</label>
          <input type="text" id="i-serie" placeholder="Ej. LAP-G1-002">
        </div>
      </div>
      <div class="grid3">
        <div class="field">
          <label for="i-modelo">Modelo</label>
          <input type="text" id="i-modelo" placeholder="Ej. Dell Latitude 5420">
        </div>
        <div class="field">
          <label for="i-encargado">Nombre del encargado</label>
          <input type="text" id="i-encargado" placeholder="Nombre y apellido">
        </div>
        <div class="field">
          <label for="i-puesto">Puesto del encargado</label>
          <input type="text" id="i-puesto" placeholder="Puesto">
        </div>
      </div>
      <div class="grid3">
        <div class="field">
          <label for="i-frecuencia">Frecuencia (meses)</label>
          <input type="number" id="i-frecuencia" min="1" max="24">
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-agregar-inv">Agregar equipo</button>
        <span class="hint" id="inv-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Equipos registrados <span class="hint" id="inv-count"></span></h2>
      <div class="filters">
        <select id="filter-garita-inv"><option value="">Todas las garitas</option></select>
        <select id="filter-tipo-inv"><option value="">Todos los tipos</option></select>
      </div>
      <div style="overflow-x:auto">
        <table id="tabla-inventario">
          <thead><tr><th>Garita</th><th>Tipo</th><th>Serie / Código</th><th>Modelo</th><th>Encargado</th><th>Puesto</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="inv-empty" style="display:none">Aún no hay equipos en el inventario.</p>
    </div>
  `;

  if (ROL === "admin") {
    container.querySelector("#card-agregar-equipo").style.display = "block";

    const iGarita = container.querySelector("#i-garita");
    const iTipo = container.querySelector("#i-tipo");
    const iFrecuencia = container.querySelector("#i-frecuencia");
    fillSelect(iGarita, GARITAS, null);
    fillSelect(iTipo, Object.keys(TIPOS_FRECUENCIA), null);
    iTipo.addEventListener("change", () => { iFrecuencia.value = TIPOS_FRECUENCIA[iTipo.value] || ""; });
    iFrecuencia.value = TIPOS_FRECUENCIA[iTipo.value] || "";

    container.querySelector("#btn-agregar-inv").addEventListener("click", async () => {
      const msg = container.querySelector("#inv-msg");
      const garita = iGarita.value, tipo = iTipo.value;
      const serie = container.querySelector("#i-serie").value.trim();
      const modelo = container.querySelector("#i-modelo").value.trim();
      const encargado_nombre = container.querySelector("#i-encargado").value.trim();
      const encargado_puesto = container.querySelector("#i-puesto").value.trim();
      const frecuencia_meses = Number(iFrecuencia.value) || TIPOS_FRECUENCIA[tipo];

      if (!serie) { msg.style.color = "#B42318"; msg.textContent = "Ingresa la serie/código del equipo."; return; }

      try {
        await addEquipo({ garita, tipo, serie, modelo, encargado_nombre, encargado_puesto, frecuencia_meses });
        container.querySelector("#i-serie").value = "";
        container.querySelector("#i-modelo").value = "";
        container.querySelector("#i-encargado").value = "";
        container.querySelector("#i-puesto").value = "";
        msg.style.color = "#1E7B34"; msg.textContent = "Equipo agregado.";
        setTimeout(() => msg.textContent = "", 2000);
        invalidateEquipos();
        await renderTabla();
      } catch (err) {
        msg.style.color = "#B42318";
        msg.textContent = err.message.includes("duplicate") ? "Ya existe un equipo con esa serie." : ("Error: " + err.message);
      }
    });
  }

  fillSelect(container.querySelector("#filter-garita-inv"), GARITAS, "Todas las garitas");
  fillSelect(container.querySelector("#filter-tipo-inv"), Object.keys(TIPOS_FRECUENCIA), "Todos los tipos");
  container.querySelector("#filter-garita-inv").addEventListener("change", renderTabla);
  container.querySelector("#filter-tipo-inv").addEventListener("change", renderTabla);

  async function renderTabla() {
    const equipos = await getEquipos();
    const fg = container.querySelector("#filter-garita-inv").value;
    const ft = container.querySelector("#filter-tipo-inv").value;
    const filtrados = equipos.filter(e => (!fg || e.garita === fg) && (!ft || e.tipo === ft));

    container.querySelector("#inv-count").textContent = `(${equipos.length} en total)`;
    container.querySelector("#inv-empty").style.display = filtrados.length ? "none" : "block";

    const tbody = container.querySelector("#tabla-inventario tbody");
    tbody.innerHTML = "";
    filtrados.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${e.garita}</td><td>${e.tipo}</td><td><b>${e.serie}</b></td><td>${e.modelo||""}</td><td>${e.encargado_nombre||""}</td><td>${e.encargado_puesto||""}</td>`;
      tbody.appendChild(tr);
    });
  }

  await renderTabla();
}

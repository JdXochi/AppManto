// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Inventario de equipos
// =========================================================
import { getEquipos, invalidateEquipos } from "../equiposStore.js";
import { addEquipo } from "../data.js";
import { TIPOS_FRECUENCIA, GARITAS, fillSelect, tiposDisponibles } from "../shared.js";

export async function render(container, { ROL }) {
  container.innerHTML = `
    <div class="card" id="card-agregar-equipo" style="display:none">
      <h2>Agregar equipo al inventario</h2>
      <p class="sub">Una fila por cada unidad física, identificada por su serie o código. Si el tipo de equipo no existe todavía (ej. "UPS"), simplemente escríbelo — se agrega solo.</p>
      <div class="grid3">
        <div class="field">
          <label for="i-garita">Garita</label>
          <select id="i-garita"></select>
        </div>
        <div class="field">
          <label for="i-tipo">Tipo de equipo</label>
          <input type="text" id="i-tipo" list="i-tipo-list" placeholder="Ej. Impresoras, UPS...">
          <datalist id="i-tipo-list"></datalist>
        </div>
        <div class="field">
          <label for="i-serie">Serie / Código de inventario</label>
          <input type="text" id="i-serie" placeholder="Ej. LAP-G1-002">
        </div>
      </div>
      <div class="grid3">
        <div class="field">
          <label for="i-marca">Marca</label>
          <input type="text" id="i-marca" placeholder="Ej. Dell, APC, Hikvision">
        </div>
        <div class="field">
          <label for="i-modelo">Modelo</label>
          <input type="text" id="i-modelo" placeholder="Ej. Latitude 5420">
        </div>
        <div class="field">
          <label for="i-frecuencia">Frecuencia (meses)</label>
          <input type="number" id="i-frecuencia" min="1" max="24">
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label for="i-encargado">Nombre del encargado</label>
          <input type="text" id="i-encargado" placeholder="Nombre y apellido">
        </div>
        <div class="field">
          <label for="i-puesto">Puesto del encargado</label>
          <input type="text" id="i-puesto" placeholder="Puesto">
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
          <thead><tr><th>Garita</th><th>Tipo</th><th>Serie / Código</th><th>Marca</th><th>Modelo</th><th>Encargado</th><th>Puesto</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="inv-empty" style="display:none">Aún no hay equipos en el inventario.</p>
    </div>
  `;

  const equiposIniciales = await getEquipos();

  if (ROL === "admin") {
    container.querySelector("#card-agregar-equipo").style.display = "block";

    const iGarita = container.querySelector("#i-garita");
    const iTipo = container.querySelector("#i-tipo");
    const iTipoList = container.querySelector("#i-tipo-list");
    const iFrecuencia = container.querySelector("#i-frecuencia");
    const iSerie = container.querySelector("#i-serie");
    const iMarca = container.querySelector("#i-marca");
    const iModelo = container.querySelector("#i-modelo");
    const iEncargado = container.querySelector("#i-encargado");
    const iPuesto = container.querySelector("#i-puesto");

    fillSelect(iGarita, GARITAS, null);

    function refreshTiposList() {
      iTipoList.innerHTML = "";
      tiposDisponibles(equiposIniciales).forEach(t => {
        const o = document.createElement("option");
        o.value = t;
        iTipoList.appendChild(o);
      });
    }
    refreshTiposList();

    // Si el tipo escrito coincide con uno conocido, sugerimos su frecuencia
    // (sin pisar un valor que la persona ya haya escrito a mano para un tipo nuevo).
    iTipo.addEventListener("input", () => {
      const sugerida = TIPOS_FRECUENCIA[iTipo.value.trim()];
      if (sugerida) iFrecuencia.value = sugerida;
    });

    function limpiarFormulario() {
      iGarita.selectedIndex = 0;
      iTipo.value = "";
      iSerie.value = "";
      iMarca.value = "";
      iModelo.value = "";
      iFrecuencia.value = "";
      iEncargado.value = "";
      iPuesto.value = "";
    }

    container.querySelector("#btn-agregar-inv").addEventListener("click", async () => {
      const msg = container.querySelector("#inv-msg");
      const garita = iGarita.value;
      const tipo = iTipo.value.trim();
      const serie = iSerie.value.trim();
      const marca = iMarca.value.trim();
      const modelo = iModelo.value.trim();
      const encargado_nombre = iEncargado.value.trim();
      const encargado_puesto = iPuesto.value.trim();
      const frecuencia_meses = Number(iFrecuencia.value) || TIPOS_FRECUENCIA[tipo] || null;

      if (!tipo) { msg.style.color = "#B42318"; msg.textContent = "Ingresa el tipo de equipo."; return; }
      if (!serie) { msg.style.color = "#B42318"; msg.textContent = "Ingresa la serie/código del equipo."; return; }
      if (!frecuencia_meses) { msg.style.color = "#B42318"; msg.textContent = "Ingresa la frecuencia (en meses) para este tipo de equipo."; return; }

      try {
        await addEquipo({ garita, tipo, serie, marca, modelo, encargado_nombre, encargado_puesto, frecuencia_meses });
        limpiarFormulario();
        msg.style.color = "#1E7B34"; msg.textContent = "Equipo agregado.";
        setTimeout(() => msg.textContent = "", 2500);
        invalidateEquipos();
        await renderTabla();
        refreshTiposList();
      } catch (err) {
        msg.style.color = "#B42318";
        msg.textContent = err.message.includes("duplicate") ? "Ya existe un equipo con esa serie." : ("Error: " + err.message);
      }
    });
  }

  fillSelect(container.querySelector("#filter-garita-inv"), GARITAS, "Todas las garitas");
  container.querySelector("#filter-garita-inv").addEventListener("change", renderTabla);
  container.querySelector("#filter-tipo-inv").addEventListener("change", renderTabla);

  async function renderTabla() {
    const equipos = await getEquipos();
    fillSelect(container.querySelector("#filter-tipo-inv"), tiposDisponibles(equipos).filter(t => equipos.some(e => e.tipo === t)), "Todos los tipos");

    const fg = container.querySelector("#filter-garita-inv").value;
    const ft = container.querySelector("#filter-tipo-inv").value;
    const filtrados = equipos.filter(e => (!fg || e.garita === fg) && (!ft || e.tipo === ft));

    container.querySelector("#inv-count").textContent = `(${equipos.length} en total)`;
    container.querySelector("#inv-empty").style.display = filtrados.length ? "none" : "block";

    const tbody = container.querySelector("#tabla-inventario tbody");
    tbody.innerHTML = "";
    filtrados.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${e.garita}</td><td>${e.tipo}</td><td><b>${e.serie}</b></td><td>${e.marca||""}</td><td>${e.modelo||""}</td><td>${e.encargado_nombre||""}</td><td>${e.encargado_puesto||""}</td>`;
      tbody.appendChild(tr);
    });
  }

  await renderTabla();
}
